import {features} from './package-catalog.mjs';
export {features};
export const tierNames=['Free','Go','Plus','Pro','Custom'];
export function initialConfig(legacy=[]){
  return {schema:1,capacityMode:'review',tiers:tierNames.map((name,i)=>{
    const old=legacy.find(p=>String(p.id).toLowerCase()===name.toLowerCase()||p.name===name);
    return {id:name.toLowerCase(),name,users:[2,5,15,40,null][i],assets:[5,20,35,60,null][i],priceMn:old?.priceMn??['$0','$5','$20','$100','Үнийн санал'][i],priceEn:old?.priceEn??['$0','$5','$20','$100','Let’s talk'][i]};
  }),assignments:Object.fromEntries(features.map(f=>[f.id,f.tier]))};
}
export function validateConfig(c){
  const errors=[];
  if(!c||c.schema!==1||!Array.isArray(c.tiers)||c.tiers.length!==5||!c.assignments)return ['Багцын бүтэц буруу / Invalid package structure'];
  if(!['review','upgrade'].includes(c.capacityMode))errors.push('Багтаамжийн нөхцөл буруу / Invalid capacity policy');
  c.tiers.forEach((p,i)=>{
    if(!p||p.id!==tierNames[i].toLowerCase()||p.name!==tierNames[i]){errors.push('Багцын дараалал буруу / Invalid tier order');return;}
    for(const key of ['priceMn','priceEn'])if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>100)errors.push(`${p.name}: Үнэ шаардлагатай / Price required`);
    for(const key of ['users','assets']){
      if(i===4){if(p[key]!==null)errors.push('Custom: Тусгай тохиролцоо / Custom limits must be null');continue;}
      if(!Number.isInteger(p[key])||p[key]<1||p[key]>1000000)errors.push(`${p.name}: ${key} — 1–1,000,000`);
      if(i>0&&p[key]<c.tiers[i-1]?.[key])errors.push(`${p.name}: Хязгаар өмнөх багцаас бага / Limits cannot decrease`);
    }
  });
  for(const f of features){const rank=c.assignments[f.id];if(!Number.isInteger(rank)||rank<0||rank>4)errors.push(`${f.mn}: Багц сонгоно уу / Choose a tier`);if(f.mandatory&&rank!==0)errors.push(`${f.mn}: Байнгын цэс Free-д байна / Mandatory in Free`);}
  if(Object.keys(c.assignments).some(id=>!features.some(f=>f.id===id)))errors.push('Танигдаагүй цэс / Unknown feature');
  return [...new Set(errors)];
}
export function recommend(c,selection){
  const selected=[...selection.menus,...selection.dashboards.map(id=>'dash_'+id)];
  const unknown=selected.filter(id=>!(id in c.assignments)&&!['mytask','allwork','inventory','projects'].includes(id));
  const ranked=selected.filter(id=>id in c.assignments);
  const rank=unknown.length?4:Math.max(0,...ranked.map(id=>c.assignments[id]));
  const base=c.tiers[rank];
  const invalid=!Number.isInteger(selection.users)||selection.users<1||!Number.isInteger(selection.assets)||selection.assets<1;
  const exceeded=rank<4&&(selection.users>base.users||selection.assets>base.assets);
  let finalRank=rank;
  if(exceeded&&c.capacityMode==='upgrade'){
    finalRank=c.tiers.findIndex((p,i)=>i>=rank&&i<4&&p.users>=selection.users&&p.assets>=selection.assets);
    if(finalRank<0)finalRank=4;
  }
  const abovePro=selection.users>c.tiers[3].users||selection.assets>c.tiers[3].assets;
  return {baseRank:rank,rank:abovePro?4:finalRank,needsReview:invalid||rank===4||abovePro||(exceeded&&c.capacityMode==='review'),invalid,exceeded,unknown,drivers:ranked.filter(id=>c.assignments[id]===rank)};
}
export function pricingRows(c){return c.tiers.map((p,i)=>({id:p.id,name:p.name,priceMn:p.priceMn,priceEn:p.priceEn,totalUsers:p.users??'Тохиролцоно',active:String(p.users??'Тохиролцоно'),inactive:'',assets:String(p.assets??'Тохиролцоно'),descriptions:[{mn:i===4?'Тусгай тохиролцоо':'Хөрөнгөд суурилсан засвар үйлчилгээ',en:i===4?'Custom agreement':'Asset-centered maintenance'}],scopes:features.filter(f=>c.assignments[f.id]<=i).map(f=>({mn:f.mn,en:f.en})),enabled:true,featured:i===2}));}
