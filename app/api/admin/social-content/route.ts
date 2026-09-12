import {env} from 'cloudflare:workers';
import {NextResponse} from 'next/server';
import {getAdminSession,hasAdminPermission} from '../../../lib/site-admin';
import {conflictMessage,hasTrustedOrigin,saveContentWithRevision} from '../../../lib/admin-security';

const KEY='socialContent';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function authorized(){const user=await getAdminSession();return{user,error:!user?reply({error:'Админ нэвтрэлт шаардлагатай.'},401):!hasAdminPermission(user,'social.manage')?reply({error:'Мэдээ, контент удирдах эрхгүй.'},403):null};}
function facebookUrl(value:unknown){try{const url=new URL(String(value));if(url.protocol!=='https:')return null;const host=url.hostname.toLowerCase();if(!['facebook.com','www.facebook.com','m.facebook.com','fb.watch'].includes(host))return null;url.hash='';return url.toString();}catch{return null;}}
function httpsUrl(value:unknown){try{const url=new URL(String(value));if(url.protocol!=='https:')return'';url.hash='';return url.toString().slice(0,2000);}catch{return'';}}
function mediaUrl(value:unknown){const raw=String(value||'').trim();if(/^\/api\/media\/[a-zA-Z0-9-]{1,100}$/.test(raw))return raw;return httpsUrl(raw);}
function meta(html:string,property:string){const safe=property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const patterns=[new RegExp(`<meta[^>]+(?:property|name)=["']${safe}["'][^>]+content=["']([^"']*)["']`,'i'),new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${safe}["']`,'i')];for(const pattern of patterns){const value=html.match(pattern)?.[1];if(value)return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').slice(0,5000);}return'';}
function normalize(rows:unknown){
  if(!Array.isArray(rows))return[];
  return rows.slice(0,200).map((value,index)=>{
    const r=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
    const type=['post','reel','event','research'].includes(String(r.type))?String(r.type):'post';
    const legacyGalleryUrls=Array.isArray(r.galleryUrls)?r.galleryUrls.map(mediaUrl).filter(Boolean).slice(0,20):[];
    const suppliedGallery=Array.isArray(r.galleryImages)?r.galleryImages:[];
    const galleryImages=(suppliedGallery.length?suppliedGallery:legacyGalleryUrls.map(url=>({url}))).map((value,imageIndex)=>{
      const image=(value&&typeof value==='object'?value:{}) as Record<string,unknown>,url=mediaUrl(image.url);
      return{id:String(image.id||`gallery-${imageIndex}-${crypto.randomUUID()}`).slice(0,100),url,captionMn:String(image.captionMn||'').slice(0,500),captionEn:String(image.captionEn||'').slice(0,500)};
    }).filter(image=>Boolean(image.url)).slice(0,20);
    const galleryUrls=galleryImages.map(image=>image.url);
    return{
      id:String(r.id||crypto.randomUUID()).slice(0,100),
      sourceUrl:type==='post'||type==='reel'?(facebookUrl(r.sourceUrl)||''):httpsUrl(r.sourceUrl),
      videoUrl:httpsUrl(r.videoUrl),type,
      title:String(r.title||'').slice(0,300),text:String(r.text||'').slice(0,12000),
      titleMn:String(r.titleMn||'').slice(0,300),titleEn:String(r.titleEn||'').slice(0,300),
      summaryMn:String(r.summaryMn||'').slice(0,1200),summaryEn:String(r.summaryEn||'').slice(0,1200),
      descriptionMn:String(r.descriptionMn||'').slice(0,12000),descriptionEn:String(r.descriptionEn||'').slice(0,12000),
      eventTypeMn:String(r.eventTypeMn||'').slice(0,160),eventTypeEn:String(r.eventTypeEn||'').slice(0,160),
      startAt:String(r.startAt||'').slice(0,40),endAt:String(r.endAt||'').slice(0,40),
      locationMn:String(r.locationMn||'').slice(0,300),locationEn:String(r.locationEn||'').slice(0,300),
      organizerMn:String(r.organizerMn||'').slice(0,300),organizerEn:String(r.organizerEn||'').slice(0,300),
      imageUrl:mediaUrl(r.imageUrl),imageCaptionMn:String(r.imageCaptionMn||'').slice(0,500),imageCaptionEn:String(r.imageCaptionEn||'').slice(0,500),galleryImages,galleryUrls,
      publishedAt:String(r.publishedAt||'').slice(0,100),
      sortOrder:Number.isFinite(Number(r.sortOrder))?Math.max(0,Math.min(9999,Math.trunc(Number(r.sortOrder)))):index,
      status:['draft','published','archived'].includes(String(r.status))?String(r.status):'draft',enabled:r.enabled!==false,
    };
  }).filter(r=>r.type==='event'||r.type==='research'||Boolean(r.sourceUrl));
}
async function read(){const row=await env.DB.prepare('SELECT value_json,updated_at FROM site_content WHERE key=?').bind(KEY).first<{value_json:string;updated_at:string}>();try{return{entries:normalize(row?JSON.parse(row.value_json):[]),revision:row?.updated_at||null};}catch{return{entries:[],revision:row?.updated_at||null};}}
export async function GET(){const {error}=await authorized();if(error)return error;return reply(await read());}
export async function POST(request:Request){if(!hasTrustedOrigin(request))return reply({error:'Origin mismatch'},403);const {error}=await authorized();if(error)return error;const body=await request.json().catch(()=>({})),sourceUrl=facebookUrl(body.url);if(!sourceUrl)return reply({error:'Facebook post эсвэл Reel-ийн зөв HTTPS холбоос оруулна уу.'},400);const existing=await read();if(existing.entries.some(row=>row.sourceUrl===sourceUrl))return reply({error:'Энэ холбоос өмнө бүртгэгдсэн байна.'},409);let title='',text='',imageUrl='',importStatus='needs_manual_review';try{const response=await fetch(sourceUrl,{headers:{'user-agent':'Mozilla/5.0 iBeX-Site-Content-Importer/1.0'},signal:AbortSignal.timeout(6000),redirect:'follow'});if(response.ok){const html=(await response.text()).slice(0,1000000);title=meta(html,'og:title');text=meta(html,'og:description');imageUrl=meta(html,'og:image');if(title||text||imageUrl)importStatus='metadata_loaded';}}catch{/* Meta can require an access token; retain a safe editable draft. */}return reply({entry:{id:crypto.randomUUID(),sourceUrl,type:sourceUrl.includes('/reel/')?'reel':'post',title,text,imageUrl,imageCaptionMn:'',imageCaptionEn:'',galleryImages:[],galleryUrls:[],publishedAt:'',status:'draft',enabled:true,importStatus}});}
export async function PUT(request:Request){if(!hasTrustedOrigin(request))return reply({error:'Origin mismatch'},403);const {user,error}=await authorized();if(error||!user)return error!;const body=await request.json().catch(()=>({})),entries=normalize(body.entries);if(!entries.length&&Array.isArray(body.entries)&&body.entries.length)return reply({error:'Бүртгэлийн холбоосуудыг шалгана уу.'},400);const incompleteEvent=entries.find(row=>row.type==='event'&&row.status==='published'&&(!row.titleMn||!row.titleEn||!row.startAt));if(incompleteEvent)return reply({error:'Published арга хэмжээнд MN/EN гарчиг болон эхлэх огноо заавал оруулна.'},400);const revision=await saveContentWithRevision({key:KEY,value:entries,userId:user.id,expectedRevision:body.revision??null});if(!revision)return reply({error:conflictMessage()},409);return reply({entries,saved:true,revision});}
