'use strict';
// Diagrams summarize the agreed processes; missing media is never fabricated.
const detailFlows={
 request:[['Хүсэлт илгээх','Submit request'],['Эрх бүхий ажилтан хянах','Authorized review'],['Батлах','Approve'],['WO Request үүсэх','WO Request created']],
 work:[['Ажил төлөвлөх','Plan work'],['Баталгаажуулах','Approve'],['Багт хуваарилах','Assign team'],['Гүйцэтгэл бүртгэх','Record execution'],['Хаах, хөрөнгийн түүхэд холбох','Close and link asset history']],
 pm:[['Хуваарь + хөрөнгө','Schedule + assets'],['PM батлах','Approve PM'],['Эхлэх команд','Start engine'],['Хуваарийн нөхцөл биелэх','Schedule condition met'],['Хөрөнгө бүрт батлагдсан WO','Approved WO per asset']],
 pdm:[['Хөрөнгийн хэмжилт','Asset measurement'],['Тоолуур / босгын дүрэм','Count / threshold rule'],['Нөхцөл биелэх','Condition met'],['Батлагдсан WO үүсэх','Approved WO created']],
 inspection:[['Үзлэг хуваарилах','Schedule inspection'],['Checklist бөглөх','Complete checklist'],['Дууссан үзлэгийг хянах','Review completed inspection'],['Засвар шаардлагатай бол WO Request','WO Request if maintenance is needed']],
 inventory:[['Хөрөнгөд тохирох сэлбэг','Asset-compatible part'],['Агуулахын үлдэгдэл шалгах','Check warehouse stock'],['Ажлын материалын хэрэгцээ','Work material demand'],['Зарлага батлах','Approve issue'],['Үлдэгдэл буурах','Stock decreases']],
 import:[['Өгөгдөл цуглуулах','Collect data'],['Код, холбоос цэгцлэх','Validate codes and relationships'],['Туршилтын импорт','Sample import'],['Алдаа засаж шалгах','Correct and verify'],['Баталгаажсан мэдээлэл оруулах','Import validated data']]
};
const detailFlowMap={'product-1-0':['request'],'product-1-1':['inspection'],'product-1-2':['work'],'product-1-3':['work'],'product-2-0':['pm'],'product-2-1':['pdm'],'product-3-1':['inventory'],'intro-1-0':['request','work'],'intro-1-1':['request','work'],'intro-1-2':['pm','pdm'],'intro-1-3':['inspection'],'intro-1-4':['inventory'],'intro-2-1':['import']};
const detailEvidenceMap={'product-1-0':0,'product-1-2':1,'product-1-3':2,'product-4-2':3,'solution-1-0':2,'solution-3-1':3};
function detailSupplementMarkup(key,g,i,en){
 const id=`${key}-${g}-${i}`,menu=(en?headerMenusEN:headerMenus)[key],title=menu.groups[g].items[i][0],lang=en?1:0;
 let html='';
 for(const flow of detailFlowMap[id]||[]){html+=`<figure class="article-flow"><figcaption>${en?'Process overview':'Үйл явцын тойм'} · ${esc(flow.toUpperCase())}</figcaption><ol>${detailFlows[flow].map(step=>`<li>${esc(step[lang])}</li>`).join('')}</ol></figure>`;}
 let rows=null;
 if(id==='product-0-0')rows=en?[['Organization','Own asset register'],['Location','Where the asset belongs'],['Parent','Higher-level equipment or assembly'],['Child','Linked component; counted individually']]:[['Байгууллага','Өөрийн хөрөнгийн бүртгэл'],['Салбар, байршил','Хөрөнгийн харьяалал'],['Parent','Дээд түвшний тоног төхөөрөмж, зангилаа'],['Child','Холбогдсон бүрэлдэхүүн; тусдаа хөрөнгөд тооцно']];
 if(id==='product-2-0')rows=en?[['Configuration','Schedule and Assets'],['Schedule types','Direct / Completed'],['Activation','Approval, then Start command'],['Multiple assets','Work generated for each selected asset'],['Generated WO','Approved; no repeat approval']]:[['Тохиргоо','Хуваарь болон Хөрөнгө'],['Хуваарийн төрөл','Direct / Completed'],['Идэвхжүүлэх','Батлах, дараа нь Эхлэх команд'],['Олон хөрөнгө','Сонгосон хөрөнгө тус бүрт ажил үүснэ'],['Үүссэн WO','Батлагдсан; давтан батлахгүй']];
 if(id==='product-2-1')rows=en?[['With Count','Count interval, e.g. mileage'],['Without Count','Defined measurement threshold'],['Current basis','Configured rules, not Predictive AI']]:[['With Count','Тоолуурын интервал, жишээ нь километр'],['Without Count','Тогтоосон хэмжилтийн босго'],['Одоогийн үндэс','Тохируулсан дүрэм; Predictive AI биш']];
 if(id==='product-2-2'||id==='solution-0-1')rows=en?[['Availability','Set by the user'],['Plan','Open work orders'],['Actual','Closed work orders']]:[['Боломжит хүчин чадал','Хэрэглэгч тохируулна'],['Төлөвлөгөө','Нээлттэй ажлын захиалга'],['Бодит гүйцэтгэл','Хаагдсан ажлын захиалга']];
 if(key==='ai')rows=en?[['Roadmap stage',menu.groups[g].t],['Human responsibility','Engineer reviews recommendations and decisions'],['Data boundary','Only authorized organization data']]:[['Хөгжүүлэлтийн төлөв',menu.groups[g].t],['Хүний хариуцлага','Зөвлөмж, шийдвэрийг инженер хянана'],['Өгөгдлийн хүрээ','Зөвхөн эрх бүхий байгууллагын мэдээлэл']];
 if(id==='intro-2-1')rows=en?[['Structure','Organization, locations, Parent–Child assets'],['Resources','Parts, warehouse, opening balances'],['People','Users, teams and permissions'],['Maintenance','PM, inspections, open work and history'],['Validation','Unique codes, relationships, units and sample import']]:[['Бүтэц','Байгууллага, байршил, Parent–Child хөрөнгө'],['Нөөц','Сэлбэг, агуулах, эхний үлдэгдэл'],['Хүмүүс','Хэрэглэгч, баг, эрх'],['Засвар','PM, үзлэг, нээлттэй ажил, түүх'],['Шалгалт','Давхардалгүй код, холбоос, нэгж, туршилтын импорт']];
 if(rows)html+=`<div class="article-table-wrap"><table class="article-table"><caption>${esc(title)} — ${en?'key references':'гол мэдээлэл'}</caption><thead><tr><th scope="col">${en?'Item':'Үзүүлэлт'}</th><th scope="col">${en?'Description':'Тайлбар'}</th></tr></thead><tbody>${rows.map(([a,b])=>`<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>`;
 const evidence=detailEvidenceMap[id];
 if(evidence!==undefined){html+=`<section class="continuous-evidence"><h3>${en?'System screens':'Системийн дэлгэцүүд'}</h3><div class="flow-step-media">${flowStepData(evidence,en).media.map(([file,caption])=>`<figure><img src="/ibex-screens/${esc(file)}" alt="${esc(caption)}" loading="lazy"><figcaption>${esc(caption)}</figcaption></figure>`).join('')}</div></section>`;}
 const hasImages=evidence!==undefined||id==='intro-1-1';
 html+=`<section class="article-media-pending" aria-label="${en?'Materials to be added':'Нэмж оруулах материал'}">`;
 if(!hasImages)html+=`<p><strong>${en?'Image to be added':'Зураг оруулна'}</strong><span>${esc(title)} — ${en?'relevant screen or supporting illustration.':'холбогдох дэлгэц эсвэл тайлбар зураг.'}</span></p>`;
 html+=`<p><strong>${en?'Video to be added':'Видео оруулна'}</strong><span>${esc(title)} — ${en?'short demonstration or topic video.':'богино үзүүлэн эсвэл сэдэвт видео.'}</span></p></section>`;
 return html;
}
