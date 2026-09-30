import { env } from "@/app/runtime/env";
import {initialConfig,normalizeConfig} from '../../public/package-model.mjs';
export type PackageConfig = ReturnType<typeof initialConfig>;
export type PackageState = {revision:number;published:PackageConfig;draft:PackageConfig|null;checked:number[];publishedAt:string|null;token:string};
export const PACKAGE_KEY='packages.state';
export async function readPackageState():Promise<{state:PackageState;raw:string|null}>{
  const row=await env.DB.prepare('SELECT value_json FROM site_content WHERE key = ?').bind(PACKAGE_KEY).first<{value_json:string}>();
  if(row){const parsed=JSON.parse(row.value_json);return {state:{...parsed,published:normalizeConfig(parsed.published),draft:parsed.draft?normalizeConfig(parsed.draft):null},raw:row.value_json};}
  const old=await env.DB.prepare('SELECT value_json FROM site_content WHERE key = ?').bind('pricing').first<{value_json:string}>();
  let legacy=[];try{legacy=old?JSON.parse(old.value_json):[];}catch{/* Preserve safe embedded defaults if legacy data is malformed. */}
  return {state:{revision:0,published:initialConfig(legacy),draft:null,checked:[],publishedAt:null,token:''},raw:null};
}
