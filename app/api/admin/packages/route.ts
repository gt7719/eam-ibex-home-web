import { env } from "@/app/runtime/env";
import {NextResponse} from 'next/server';
import {getAdminSession,hasAdminPermission} from '../../../lib/site-admin';
import {PACKAGE_KEY,readPackageState} from '../../../lib/packages';
import {normalizeConfig,validateConfig} from '../../../../public/package-model.mjs';
import {readBoundedText} from '../../../lib/http-input';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function authorized(){const user=await getAdminSession();return {user,error:!user?reply({error:'Админ нэвтрэлт шаардлагатай.'},401):!hasAdminPermission(user,'pricing.manage')?reply({error:'Багц удирдах эрхгүй.'},403):null};}
export async function GET(){
  const {error}=await authorized();if(error)return error;
  try{
    const {state}=await readPackageState();
    const rows=await env.DB.prepare("SELECT key, updated_at, updated_by FROM site_content WHERE key LIKE 'packages.history.%' ORDER BY updated_at DESC LIMIT 100").all();
    return reply({...state,history:rows.results||[]});
  }catch{return reply({error:'Тохиргоог уншихад алдаа гарлаа.'},503);}
}
export async function PUT(request:Request){
  const {user,error}=await authorized();if(error||!user)return error!;
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Origin mismatch'},403);
  try{
    const text=await readBoundedText(request,100000);if(!text.ok)return reply({error:text.error},text.status);
    const body=JSON.parse(text.value||'{}');const {state,raw}=await readPackageState();
    if(body.revision!==state.revision)return reply({error:'Өөр админ тохиргоог шинэчилсэн. Дахин ачаалж хянана уу.'},409);
    if(!['draft','publish','restore'].includes(body.action))return reply({error:'Үйлдэл буруу.'},400);
    let config=body.config;
    if(body.action==='restore'){
      if(typeof body.historyKey!=='string'||!/^packages\.history\.[a-zA-Z0-9-]+$/.test(body.historyKey))return reply({error:'Түүхийн дугаар буруу.'},400);
      const history=await env.DB.prepare('SELECT value_json FROM site_content WHERE key = ?').bind(body.historyKey).first<{value_json:string}>();
      if(!history)return reply({error:'Түүх олдсонгүй.'},404);config=normalizeConfig(JSON.parse(history.value_json));
    }
    const issues=validateConfig(config);if(issues.length)return reply({error:issues.join('\n')},400);
    config=normalizeConfig(config);
    const checked=Array.isArray(body.checked)?[...new Set(body.checked.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<5))]:[];
    if(body.action==='publish'&&checked.length!==5)return reply({error:'Таван багцыг бүгдийг хянаж батална уу.'},400);
    const now=new Date().toISOString(),token=crypto.randomUUID();
    const next={...state,revision:state.revision+1,token,draft:config,checked:body.action==='restore'?[]:checked};
    if(body.action==='publish'){next.published=config;next.publishedAt=now;next.draft=null;next.checked=[];}
    const value=JSON.stringify(next);
    const write=raw===null?env.DB.prepare('INSERT INTO site_content (key,value_json,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO NOTHING').bind(PACKAGE_KEY,value,user.id,now):env.DB.prepare('UPDATE site_content SET value_json=?,updated_by=?,updated_at=? WHERE key=? AND value_json=?').bind(value,user.id,now,PACKAGE_KEY,raw);
    const statements=[write];
    if(body.action==='publish'){
      // Conditional history inserts belong to the same atomic batch as the CAS write.
      for(const [suffix,snapshot] of [[token,config],...(!state.publishedAt?[[token+'-baseline',state.published]]:[])] as const){
        statements.push(env.DB.prepare('INSERT INTO site_content (key,value_json,updated_by,updated_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM site_content WHERE key=? AND value_json=?)').bind('packages.history.'+suffix,JSON.stringify(snapshot),user.id,now,PACKAGE_KEY,value));
      }
    }
    const result=await env.DB.batch(statements);
    if(!(result[0]?.meta?.changes ?? 0))return reply({error:'Зэрэгцээ өөрчлөлт илэрлээ. Дахин ачаална уу.'},409);
    return reply({saved:true,revision:next.revision,publishedAt:next.publishedAt});
  }catch(error){console.error('package_configuration_failed',error instanceof SyntaxError?'invalid_json':'storage');return reply({error:'Хадгалж чадсангүй. Формат болон холболтоо шалгана уу.'},error instanceof SyntaxError?400:503);}
}
