import test from 'node:test';
import assert from 'node:assert/strict';
import {features,initialConfig,validateConfig,recommend,pricingRows} from '../public/package-model.mjs';
const pick=(menus=[],users=2,assets=5,dashboards=[])=>({menus,users,assets,dashboards});
test('approved defaults and inherited menu assignments',()=>{
 const c=initialConfig();assert.deepEqual(c.tiers.map(p=>[p.users,p.assets]),[[2,5],[5,20],[15,35],[40,60],[null,null]]);assert.deepEqual(validateConfig(c),[]);
 for(const f of features.filter(f=>f.mandatory))assert.equal(c.assignments[f.id],0);
 assert.equal(c.assignments.pm,1);assert.equal(c.assignments.warehouse,2);assert.equal(c.assignments.pdm,3);assert.equal(c.assignments.hse,4);
 const rows=pricingRows(c);assert.ok(rows[3].scopes.some(x=>x.en==='PM'));assert.ok(!rows[3].scopes.some(x=>x.en==='HSE'));assert.ok(rows[4].scopes.some(x=>x.en==='HSE'));
});
test('migrates explicit MNT values and never converts legacy USD',()=>{
 const c=initialConfig([{id:'go',priceMn:'₮123'},{id:'plus',priceMn:'$20'}]);assert.equal(c.tiers[1].monthlyMnt,123);assert.equal(pricingRows(c)[1].monthlyMnt,123);assert.equal(c.tiers[2].monthlyMnt,null);
});
test('independent menu, total user and parent-child asset needs',()=>{
 const c=initialConfig();assert.equal(recommend(c,pick()).rank,0);assert.equal(recommend(c,pick(['pm'],5,20)).rank,1);assert.equal(recommend(c,pick(['warehouse'],15,35)).rank,2);
 assert.equal(recommend(c,pick(['hse'],1,1)).rank,4);assert.equal(recommend(c,pick([],2,61)).rank,4);
 assert.equal(recommend(c,pick([],3,5)).rank,1);assert.equal(recommend(c,pick([],2,6)).rank,1);
 assert.equal(recommend(c,pick([],5,10)).rank,1);
 assert.equal(recommend(c,pick([],1,1,['monitor'])).rank,3);
 c.capacityMode='upgrade';assert.equal(recommend(c,pick(['pm'],2,60)).rank,3);assert.equal(recommend(c,pick([],40,1)).rank,3);
 assert.equal(recommend(c,pick([],0,1)).invalid,true);
});
test('dynamic assignment changes take effect and invalid configs are rejected',()=>{
 const c=initialConfig();c.assignments.pm=2;assert.equal(recommend(c,pick(['pm'],2,5)).rank,2);
 c.tiers[2].users=1;assert.ok(validateConfig(c).length);c.tiers[2].users=15;c.assignments.assets=1;assert.ok(validateConfig(c).length);
});
