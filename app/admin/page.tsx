"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminUser = {
  email: string;
  name: string;
  canManageAdmins?: boolean;
  permissions?: string[];
};

type Lang = "mn" | "en";

const adminSections = [
  { id: "navigation", permission: "navigation.manage", mn: "Толгой цэсний мэдээлэл", en: "Header menu content", src: "/admin/navigation?embedded=1" },
  { id: "partners", permission: "partners.manage", mn: "Хамтрагч байгууллага", en: "Partner organizations", src: "/concept.html?admin=content&embeddedHub=1&section=partners" },
  { id: "people", permission: "people.manage", mn: "Төслийн баг", en: "Project team", src: "/concept.html?admin=content&embeddedHub=1&section=people" },
  { id: "pricing", permission: "pricing.manage", mn: "Үнэ ба багц", en: "Pricing", src: "/admin/pricing?embedded=1" },
  { id: "ai", permission: "ai.manage", mn: "AI удирдлага", en: "AI management", src: "" },
  { id: "social", permission: "social.manage", mn: "Мэдээ ба контент", en: "News & content", src: "/admin/social?embedded=1" },
  { id: "accounts", permission: "accounts.manage", mn: "Веб хэрэглэгчид", en: "Website users", src: "/admin/site-users?embedded=1" },
] as const;

const aiAreas = [
  { id: "home", permission: "knowledge.manage", mn: "Home AI мэдлэгийн сан", en: "Home AI knowledge", src: "/admin/assistant?embedded=1" },
  { id: "marketing", permission: "marketing.manage", mn: "Marketing AI", en: "Marketing AI", src: "/admin/marketing-ai?embedded=1" },
] as const;

const adminPermissions = new Set([
  "navigation.manage",
  "partners.manage",
  "people.manage",
  "pricing.manage",
  "knowledge.manage",
  "marketing.manage",
  "ai.manage",
  "social.manage",
  "accounts.manage",
]);

function storedLanguage(): Lang {
  try {
    return localStorage.getItem("ibex-lang") === "en" ? "en" : "mn";
  } catch {
    return "mn";
  }
}

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [lang, setLang] = useState<Lang>("mn");
  const [section, setSection] = useState<string>("partners");
  const [aiArea, setAiArea] = useState<string>("home");
  const [iframeDirty, setIframeDirty] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("admin-hub-open");
    const syncLanguage = () => setLang(storedLanguage());
    const receiveAppearance = (event: MessageEvent) => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === "ibex-global-appearance") syncLanguage();
      if (event.data?.type === "ibex-admin-dirty") setIframeDirty(event.data.dirty === true);
    };
    const appearanceTimer = window.setTimeout(syncLanguage, 0);
    window.addEventListener("storage", syncLanguage);
    window.addEventListener("message", receiveAppearance);

    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.replace("/admin/login");
          return;
        }
        const payload = await response.json();
        setUser(payload.user);
        setChecking(false);
      })
      .catch(() => window.location.replace("/admin/login"));

    return () => {
      window.clearTimeout(appearanceTimer);
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("message", receiveAppearance);
      document.documentElement.classList.remove("admin-hub-open");
    };
  }, []);

  async function logout() {
    if (iframeDirty && !window.confirm(lang === "en" ? "Discard unsaved changes?" : "Хадгалаагүй өөрчлөлтийг цуцлах уу?")) return;
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login");
  }

  function changeSection(next: string) {
    if (next === section) return;
    if (iframeDirty && !window.confirm(lang === "en" ? "Discard unsaved changes?" : "Хадгалаагүй өөрчлөлтийг цуцлах уу?")) return;
    setIframeDirty(false);
    setSection(next);
  }

  function changeAiArea(next: string) {
    if (next === aiArea) return;
    if (iframeDirty && !window.confirm(lang === "en" ? "Discard unsaved changes?" : "Хадгалаагүй өөрчлөлтийг цуцлах уу?")) return;
    setIframeDirty(false);
    setAiArea(next);
  }

  if (checking) {
    return <main className="admin-gate">{lang === "en" ? "Checking administrator access…" : "Админ эрхийг шалгаж байна…"}</main>;
  }

  const hasWorkspaceAccess = (user?.permissions || []).some((permission) =>
    adminPermissions.has(permission),
  );
  const allowedSections = adminSections.filter((item) => item.id === "ai"
    ? (user?.permissions || []).some(permission => permission === "knowledge.manage" || permission === "marketing.manage")
    : (user?.permissions || []).includes(item.permission));
  const activeSection = allowedSections.find((item) => item.id === section) || allowedSections[0];
  const allowedAiAreas = aiAreas.filter((item) => (user?.permissions || []).includes(item.permission));
  const activeAiArea = allowedAiAreas.find((item) => item.id === aiArea) || allowedAiAreas[0];
  const ui = lang === "en"
    ? { users: "Admin users", home: "Home", logout: "Log out", empty: "You do not have permission to manage a content area." }
    : { users: "Админ хэрэглэгчид", home: "Нүүр хуудас", logout: "Гарах", empty: "Танд удирдах хэсгийн эрх олгогдоогүй байна." };

  return (
    <main className="admin-workspace admin-hub-page">
      <div className="admin-session-bar">
        <span>
          <strong>{user?.name}</strong>
          <small>{user?.email}</small>
        </span>
        {user?.canManageAdmins ? <Link href="/admin/users">{ui.users}</Link> : null}
        <Link href="/" onClick={(event) => { if (iframeDirty && !window.confirm(lang === "en" ? "Discard unsaved changes?" : "Хадгалаагүй өөрчлөлтийг цуцлах уу?")) event.preventDefault(); }}>{ui.home}</Link>
        <button type="button" onClick={logout}>{ui.logout}</button>
      </div>
      <section className="admin-hub-shell admin-hub-single" aria-label="Сайтын админ удирдлага">
        {hasWorkspaceAccess ? (
          <>
            <nav className="admin-hub-tabs" role="tablist" aria-label={lang === "en" ? "Administration sections" : "Админ тохиргооны хэсгүүд"}>
              {allowedSections.map((item) => <button id={`admin-tab-${item.id}`} aria-controls="admin-section-panel" key={item.id} type="button" role="tab" aria-selected={item.id === activeSection?.id} className={item.id === activeSection?.id ? "active" : ""} onClick={() => changeSection(item.id)}>{lang === "en" ? item.en : item.mn}</button>)}
            </nav>
            <div id="admin-section-panel" className="admin-hub-content" role="tabpanel" aria-labelledby={activeSection ? `admin-tab-${activeSection.id}` : undefined}>
              {activeSection?.id === "ai" && activeAiArea ? <div className="admin-ai-workspace">
                <header><span>AI MANAGEMENT</span><h2>{lang === "en" ? "AI management" : "AI удирдлага"}</h2><p>{lang === "en" ? "Home AI knowledge and Marketing AI remain separate by permission and data." : "Home AI мэдлэг болон Marketing AI нь эрх, өгөгдлөөрөө тусгаарлагдсан хэвээр нэг цэгээс удирдагдана."}</p></header>
                <nav className="ai-admin-tabs" role="tablist" aria-label={lang === "en" ? "AI administration areas" : "AI удирдлагын хэсгүүд"}>{allowedAiAreas.map((item) => <button id={`admin-ai-tab-${item.id}`} aria-controls="admin-ai-panel" key={item.id} type="button" role="tab" aria-selected={item.id === activeAiArea.id} className={item.id === activeAiArea.id ? "active" : ""} onClick={() => changeAiArea(item.id)}>{lang === "en" ? item.en : item.mn}</button>)}</nav>
                <iframe className="ai-admin-frame" id="admin-ai-panel" role="tabpanel" aria-labelledby={`admin-ai-tab-${activeAiArea.id}`} key={activeAiArea.id} src={activeAiArea.src} title={lang === "en" ? activeAiArea.en : activeAiArea.mn} />
              </div> : activeSection ? <iframe key={activeSection.id} src={activeSection.src} title={lang === "en" ? activeSection.en : activeSection.mn} /> : null}
            </div>
          </>
        ) : (
          <p className="admin-hub-empty">{ui.empty}</p>
        )}
      </section>
    </main>
  );
}
