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

const adminPermissions = new Set([
  "partners.manage",
  "people.manage",
  "pricing.manage",
  "knowledge.manage",
  "social.manage",
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

  useEffect(() => {
    document.documentElement.classList.add("admin-hub-open");
    const syncLanguage = () => setLang(storedLanguage());
    const receiveAppearance = (event: MessageEvent) => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === "ibex-global-appearance") syncLanguage();
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
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login");
  }

  if (checking) {
    return <main className="admin-gate">{lang === "en" ? "Checking administrator access…" : "Админ эрхийг шалгаж байна…"}</main>;
  }

  const hasWorkspaceAccess = (user?.permissions || []).some((permission) =>
    adminPermissions.has(permission),
  );
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
        <Link href="/">{ui.home}</Link>
        <button type="button" onClick={logout}>{ui.logout}</button>
      </div>
      <section className="admin-hub-shell admin-hub-single" aria-label="Сайтын админ удирдлага">
        {hasWorkspaceAccess ? (
          <div className="admin-hub-content">
            <iframe
              src="/concept.html?admin=content&embeddedHub=1"
              title={lang === "en" ? "iBeX site administration" : "iBeX сайтын админ удирдлага"}
            />
          </div>
        ) : (
          <p className="admin-hub-empty">{ui.empty}</p>
        )}
      </section>
    </main>
  );
}
