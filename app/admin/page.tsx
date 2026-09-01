"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
type AdminUser = {
  email: string;
  name: string;
  canManageAdmins?: boolean;
  permissions?: string[];
};
type AdminSection = "partners" | "people" | "pricing" | "knowledge" | "social";
type Lang = "mn" | "en";
type SectionCopy = { label: string; title: string; description: string };
const sections: Array<{
  id: AdminSection;
  permission: string;
  copy: Record<Lang, SectionCopy>;
  src: string;
}> = [
  {
    id: "partners",
    permission: "partners.manage",
    copy: { mn: { label: "Хамтрагч байгууллага", title: "Хамтрагч байгууллага", description: "Байгууллагын нэр, лого, холбоос болон нийтэд харагдах тайлбарыг удирдана." }, en: { label: "Partners", title: "Partner organizations", description: "Manage organization names, logos, links and public descriptions." } },
    src: "/concept.html?admin=content&embeddedHub=1&hubSection=partners",
  },
  {
    id: "people",
    permission: "people.manage",
    copy: { mn: { label: "Төслийн баг", title: "Төслийн баг", description: "Багийн гишүүний зураг, үүрэг, байгууллага болон танилцуулгыг удирдана." }, en: { label: "Project team", title: "Project team", description: "Manage team member photos, roles, organizations and profiles." } },
    src: "/concept.html?admin=content&embeddedHub=1&hubSection=people",
  },
  {
    id: "pricing",
    permission: "pricing.manage",
    copy: { mn: { label: "Үнэ ба багц", title: "Үнэ ба төлбөр", description: "Багцын шатлал, MNT үнэ, жилийн хөнгөлөлт болон төлбөрийн холбоосыг удирдана." }, en: { label: "Pricing", title: "Pricing and payments", description: "Manage package tiers, MNT prices, annual discounts and payment links." } },
    src: "/admin/pricing?embedded=1",
  },
  {
    id: "knowledge",
    permission: "knowledge.manage",
    copy: { mn: { label: "AI мэдлэгийн сан", title: "AI мэдлэгийн сан", description: "Сайтын AI туслахын баталгаажсан эх сурвалж, төлөв болон хувилбарыг удирдана." }, en: { label: "AI knowledge", title: "AI knowledge base", description: "Manage approved sources, governance status and versions for the website assistant." } },
    src: "/admin/assistant?embedded=1",
  },
  {
    id: "social",
    permission: "social.manage",
    copy: { mn: { label: "Мэдээ ба контент", title: "Мэдээ ба контент", description: "Facebook пост, Reel, зураг болон нийтлэх төлөвийг эрхийн хүрээнд удирдана." }, en: { label: "News & content", title: "News and content", description: "Manage Facebook posts, Reels, images and publishing status within assigned access." } },
    src: "/admin/social?embedded=1",
  },
];
export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null),
    [checking, setChecking] = useState(true),
    [active, setActive] = useState<AdminSection>("partners"),
    [lang, setLang] = useState<Lang>("mn");
  useEffect(() => {
    document.documentElement.classList.add("admin-hub-open");
    const appearanceTimer = window.setTimeout(() => setLang(localStorage.getItem("ibex-lang") === "en" ? "en" : "mn"), 0);
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
    return () => { window.clearTimeout(appearanceTimer); document.documentElement.classList.remove("admin-hub-open"); };
  }, []);
  const allowed = useMemo(() => {
    const permissions = new Set(user?.permissions || []);
    return sections.filter((section) => permissions.has(section.permission));
  }, [user]);
  useEffect(() => {
    if (allowed.length && !allowed.some((section) => section.id === active)) {
      const timer = window.setTimeout(() => setActive(allowed[0].id), 0);
      return () => window.clearTimeout(timer);
    }
  }, [active, allowed]);
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login");
  }
  if (checking)
    return <main className="admin-gate">Админ эрхийг шалгаж байна…</main>;
  const current =
    allowed.find((section) => section.id === active) || allowed[0];
  const currentCopy = current?.copy[lang];
  const ui = lang === "en" ? { users: "Admin users", home: "Home", logout: "Log out", empty: "You do not have permission to manage a content area.", admin: "Site administration" } : { users: "Админ хэрэглэгчид", home: "Нүүр хуудас", logout: "Гарах", empty: "Танд удирдах хэсгийн эрх олгогдоогүй байна.", admin: "Сайтын админ" };
  return (
    <main className="admin-workspace admin-hub-page">
      <div className="admin-session-bar">
        <span>
          <strong>{user?.name}</strong>
          <small>{user?.email}</small>
        </span>
        {user?.canManageAdmins ? (
          <Link href="/admin/users">{ui.users}</Link>
        ) : null}
        <Link href="/">{ui.home}</Link>
        <button type="button" onClick={logout}>
          {ui.logout}
        </button>
      </div>
      <section className="admin-hub-shell" aria-label="Сайтын админ удирдлага">
        <header className="admin-hub-header">
          <div>
            <span>ADMIN • iBeX</span>
            <h1>{currentCopy?.title || ui.admin}</h1>
            <p>{currentCopy?.description || ui.empty}</p>
          </div>
          <Link href="/" aria-label={ui.home} title={ui.home}>
            ×
          </Link>
        </header>
        {allowed.length ? (
          <nav className="admin-hub-tabs" aria-label="Админ хэсгүүд">
            {allowed.map((section) => (
              <button
                key={section.id}
                type="button"
                className={section.id === current?.id ? "active" : ""}
                onClick={() => setActive(section.id)}
              >
                {section.copy[lang].label}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="admin-hub-content">
          {current ? (
            <iframe key={current.id} src={current.src} title={currentCopy.title} />
          ) : (
            <p className="admin-hub-empty">
              {ui.empty}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
