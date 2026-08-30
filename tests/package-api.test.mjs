import test from 'node:test';
import assert from 'node:assert/strict';
import {initialConfig} from '../public/package-model.mjs';
function database(permission=true){
 const rows=new Map();let conflict=false;
 const db={rows,setConflict:()=>conflict=true,prepare(sql){const s={values:[],bind(...v){this.values=v;return this;},async first(){
  if(sql.includes('FROM admin_sessions'))return {id:'tester',email:'test@example.com',name:'Test',role:'editor',permissions_json:JSON.stringify(permission?['pricing.manage']:[]),status:'active',last_access:null};
  if(sql.includes('FROM site_content')){const value=rows.get(this.values[0]);return value?{value_json:value}:null;}return null;
 },async all(){return {results:[...rows].filter(([k])=>k.startsWith('packages.history.')).map(([key])=>({key,updated_at:'2026-08-30',updated_by:'tester'}))};},async run(){return {success:true,meta:{changes:1}};}};s.sql=sql;return s;},async batch(statements){return statements.map(s=>{
  const v=s.values;if(s.sql.startsWith('UPDATE site_content')){if(conflict||rows.get(v[3])!==v[4])return {meta:{changes:0}};rows.set(v[3],v[0]);return {meta:{changes:1}};}
  if(s.sql.includes('SELECT ?,?,?,? WHERE EXISTS')){if(rows.get(v[4])===v[5]){rows.set(v[0],v[1]);return {meta:{changes:1}};}return {meta:{changes:0}};}
  if(s.sql.startsWith('INSERT INTO site_content')){if(conflict||rows.has(v[0]))return {meta:{changes:0}};rows.set(v[0],v[1]);return {meta:{changes:1}};}return {meta:{changes:1}};
 });}};return db;
}
async function dispatch(db,path,body){const {default:worker}=await import('../dist/server/index.js');const env={DB:db,ASSETS:{fetch:async()=>new Response('',{status:404})}};globalThis.__CLOUDFLARE_TEST_ENV__=env;try{return await worker.fetch(new Request('http://localhost'+path,{method:body?'PUT':'GET',headers:{cookie:'ibex_site_session=test',accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{waitUntil(){},passThroughOnException(){}});}finally{delete globalThis.__CLOUDFLARE_TEST_ENV__;}}
test('unauthorized package reads and writes are denied',{concurrency:false},async()=>{const db=database(false);assert.equal((await dispatch(db,'/api/admin/packages')).status,403);assert.equal((await dispatch(db,'/api/admin/packages',{action:'draft',revision:0,config:initialConfig()})).status,403);assert.equal(db.rows.size,0);});
test('draft isolation, atomic publication, history and restoration',{concurrency:false},async()=>{
 const db=database();const c=initialConfig();c.tiers[1].priceMn='₮999';
 let r=await dispatch(db,'/api/admin/packages',{action:'draft',revision:0,config:c,checked:[0,1]});assert.equal(r.status,200);
 let pub=await (await dispatch(db,'/api/packages')).json();assert.equal(pub.config.tiers[1].priceMn,'$5');
 r=await dispatch(db,'/api/admin/packages',{action:'publish',revision:1,config:c,checked:[0,1]});assert.equal(r.status,400);
 r=await dispatch(db,'/api/admin/packages',{action:'publish',revision:1,config:c,checked:[0,1,2,3,4]});assert.equal(r.status,200);
 pub=await (await dispatch(db,'/api/packages')).json();assert.equal(pub.config.tiers[1].priceMn,'₮999');
 const snapshot=await (await dispatch(db,'/api/admin/packages')).json();assert.equal(snapshot.history.length,2);
 const old=snapshot.history.find(x=>x.key.endsWith('-baseline'));
 r=await dispatch(db,'/api/admin/packages',{action:'restore',revision:2,historyKey:old.key});assert.equal(r.status,200);
 const restored=await (await dispatch(db,'/api/admin/packages')).json();assert.equal(restored.draft.tiers[1].priceMn,'$5');assert.equal(restored.published.tiers[1].priceMn,'₮999');assert.deepEqual(restored.checked,[]);
});
test('stale revision, CAS conflicts and invalid assignments cannot publish',{concurrency:false},async()=>{
 const db=database(),c=initialConfig();let r=await dispatch(db,'/api/admin/packages',{action:'publish',revision:9,config:c,checked:[0,1,2,3,4]});assert.equal(r.status,409);
 c.assignments.assets=3;r=await dispatch(db,'/api/admin/packages',{action:'draft',revision:0,config:c});assert.equal(r.status,400);c.assignments.assets=0;
 db.setConflict();r=await dispatch(db,'/api/admin/packages',{action:'publish',revision:0,config:c,checked:[0,1,2,3,4]});assert.equal(r.status,409);assert.equal(db.rows.size,0);
});
test('legacy pricing editor cannot bypass the package publication workflow',{concurrency:false},async()=>{const r=await dispatch(database(),'/api/admin/content',{pricing:[]});assert.equal(r.status,409);});
