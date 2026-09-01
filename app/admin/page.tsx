"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
type AdminUser={email:string;name:string;canManageAdmins?:boolean;permissions?:string[]};
type AdminSection="partners"|"people"|"pricing"|"knowledge"|"social";
const sections:Array<{id:AdminSection;permission:string;label:string;title:string;description:string;src:string}>=[
{id:"partners",permission:"partners.manage",label:"Хамтрагч байгууллага",title:"Хамтрагч байгууллага",description:"Байгууллагын нэр, лого, холбоос болон нийтэд харагдах тайлбарыг удирдана.",src:"/concept.html?admin=content&embeddedHub=1&hubSection=partners"},
{id:"people",permission:"people.manage",label:"Төслийн баг",title:"Төслийн баг",description:"Багийн гишүүний зураг, үүрэг, байгууллага болон танилцуулгыг удирдана.",src:"/concept.html?admin=content&embeddedHub=1&hubSection=people"},
{id:"pricing",permission:"pricing.manage",label:"Үнэ ба багц",title:"Үнэ ба төлбөр",description:"Багцын шатлал, MNT үнэ, жилийн хөнгөлөлт болон төлбөрийн холбоосыг удирдана.",src:"/admin/pricing?embedded=1"},
{id:"knowledge",permission:"knowledge.manage",label:"AI мэдлэгийн сан",title:"AI мэдлэгийн сан",description:"Сайтын AI туслахын баталгаажсан эх сурвалж, төлөв болон хувилбарыг удирдана.",src:"/admin/assistant?embedded=1"},
{id:"social",permission:"social.manage",label:"Мэдээ ба контент",title:"Мэдээ ба контент",description:"Facebook пост, Reel, зураг болон нийтлэх төлөвийг эрхийн хүрээнд удирдана.",src:"/admin/social?embedded=1"}];
export default function AdminPage(){
const[user,setUser]=useState<AdminUser|null>(null),[checking,setChecking]=useState(true),[active,setActive]=useState<AdminSection>("partners");
useEffect(()=>{document.documentElement.classList.add("admin-hub-open");fetch("/api/admin/session",{cache:"no-store"}).then(async response=>{if(!response.ok){window.location.replace("/admin/login");return}const payload=await response.json();setUser(payload.user);setChecking(false)}).catch(()=>window.location.replace("/admin/login"));return()=>document.documentElement.classList.remove("admin-hub-open")},[]);
const allowed=useMemo(()=>{const permissions=new Set(user?.permissions||[]);return sections.filter(section=>permissions.has(section.permission))},[user]);
useEffect(()=>{if(allowed.length&&!allowed.some(section=>section.id===active)){const timer=window.setTimeout(()=>setActive(allowed[0].id),0);return()=>window.clearTimeout(timer)}},[active,allowed]);
async function logout(){await fetch("/api/admin/logout",{method:"POST"});window.location.replace("/admin/login")}
if(checking)return <main className="admin-gate">Админ эрхийг шалгаж байна…</main>;
const current=allowed.find(section=>section.id===active)||allowed[0];
return <main className="admin-workspace admin-hub-page"><div className="admin-session-bar"><span><strong>{user?.name}</strong><small>{user?.email}</small></span>{user?.canManageAdmins?<Link href="/admin/users">Админ хэрэглэгчид</Link>:null}<Link href="/">Нүүр хуудас</Link><button type="button" onClick={logout}>Гарах</button></div><section className="admin-hub-shell" aria-label="Сайтын админ удирдлага"><header className="admin-hub-header"><div><span>ADMIN • iBeX</span><h1>{current?.title||"Сайтын админ"}</h1><p>{current?.description||"Танд удирдах хэсгийн эрх олгогдоогүй байна."}</p></div><Link href="/" aria-label="Нүүр хуудас" title="Нүүр хуудас">×</Link></header>{allowed.length?<nav className="admin-hub-tabs" aria-label="Админ хэсгүүд">{allowed.map(section=><button key={section.id} type="button" className={section.id===current?.id?"active":""} onClick={()=>setActive(section.id)}>{section.label}</button>)}</nav>:null}<div className="admin-hub-content">{current?<iframe key={current.id} src={current.src} title={current.title}/>:<p className="admin-hub-empty">Танд удирдах хэсгийн эрх олгогдоогүй байна.</p>}</div></section></main>}
