"use client";

import { useEffect, useState } from "react";

type AdminUser = { email: string; name: string };

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
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
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.replace("/admin/login");
  }

  if (checking) {
    return <main className="admin-gate">Админ эрхийг шалгаж байна…</main>;
  }

  return (
    <main className="admin-workspace">
      <div className="admin-session-bar">
        <span><strong>{user?.name}</strong><small>{user?.email}</small></span>
        <a href="/">Нүүр хуудас</a>
        <button type="button" onClick={logout}>Гарах</button>
      </div>
      <iframe
        className="concept-frame"
        src="/concept.html?admin=1"
        title="iBeX сайтын админ удирдлага"
      />
    </main>
  );
}
