"use client";

import { useEffect, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";

type Area = { id: "home-control" | "home" | "marketing"; permission: string; mn: string; en: string; src: string };
const areas: Area[] = [
  { id: "home-control", permission: "knowledge.manage", mn: "Home AI удирдлага", en: "Home AI control", src: "/admin/home-ai?embedded=1" },
  { id: "home", permission: "knowledge.manage", mn: "Home AI мэдлэгийн сан", en: "Home AI knowledge", src: "/admin/assistant?embedded=1" },
  { id: "marketing", permission: "marketing.manage", mn: "Маркетинг AI", en: "Marketing AI", src: "/admin/marketing-ai?embedded=1" },
];

export default function AiAdminPage() {
  const { t } = useSiteLanguage();
  const [allowed, setAllowed] = useState<Area[]>([]), [active, setActive] = useState<Area | null>(null), [checking, setChecking] = useState(true);
  useEffect(() => { fetch("/api/admin/session", { cache: "no-store" }).then(async response => {
    if (!response.ok) { window.location.replace("/admin/login"); return; }
    const payload = await response.json(), permissions: string[] = payload.user?.permissions || [];
    const next = areas.filter(area => area.id === "marketing" ? permissions.some(permission => permission.startsWith("marketing.")) : permissions.includes(area.permission)); setAllowed(next); setActive(next[0] || null); setChecking(false);
  }).catch(() => window.location.replace("/admin/login")); }, []);
  if (checking) return <main className="admin-gate">{t("AI удирдлагын эрхийг шалгаж байна…", "Checking AI management access…")}</main>;
  return <main className="ai-admin-page embedded-admin-page">
    <header className="ai-admin-head"><span className="admin-auth-kicker">AI MANAGEMENT</span><h1>{t("AI удирдлага", "AI management")}</h1><p>{t("Home AI-ийн мэдлэг болон Marketing AI-ийн ажиллагаа тусдаа эрх, өгөгдөлтэй хэвээр нэг цэгээс удирдагдана.", "Manage Home AI knowledge and Marketing AI from one place while retaining separate permissions and data.")}</p></header>
    <nav className="ai-admin-tabs" role="tablist">{allowed.map(area => <button key={area.id} type="button" role="tab" aria-selected={area.id === active?.id} className={area.id === active?.id ? "active" : ""} onClick={() => setActive(area)}>{t(area.mn, area.en)}</button>)}</nav>
    {active ? <iframe className="ai-admin-frame" key={active.id} src={active.src} title={t(active.mn, active.en)} /> : <p className="admin-hub-empty">{t("AI удирдах эрх олгогдоогүй байна.", "No AI management permission is assigned.")}</p>}
  </main>;
}
