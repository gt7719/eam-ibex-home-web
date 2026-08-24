"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type SessionUser = {
  email: string;
  name: string;
  role: string;
  canManageAdmins: boolean;
};

type ManagedAdmin = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastAccess: string | null;
};

export default function AdminUsersPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<ManagedAdmin[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [inviteEnabled, setInviteEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/users", { cache: "no-store" }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || "Админ хэрэглэгчдийн мэдээллийг уншиж чадсангүй.");
      setLoading(false);
      return;
    }
    setUsers(payload.users || []);
    setInviteEnabled(Boolean(payload.inviteEnabled));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.replace("/admin/login");
          return;
        }
        const payload = await response.json();
        if (!payload.user?.canManageAdmins) {
          window.location.replace("/admin");
          return;
        }
        setSession(payload.user);
        await loadUsers();
      })
      .catch(() => window.location.replace("/admin/login"));
  }, [loadUsers]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || "Урилга илгээж чадсангүй.");
      setWorking(false);
      return;
    }
    setEmail("");
    setMessage("Админ нэвтрэх урилгыг и-мэйлээр илгээлээ.");
    await loadUsers();
    setWorking(false);
  }

  async function changeStatus(user: ManagedAdmin) {
    const status = user.status === "active" ? "suspended" : "active";
    setWorking(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, status }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || "Хэрэглэгчийн төлөвийг өөрчилж чадсангүй.");
      setWorking(false);
      return;
    }
    setMessage(status === "active" ? "Админ хэрэглэгчийг идэвхжүүллээ." : "Админ хэрэглэгчийг түр идэвхгүй болголоо.");
    await loadUsers();
    setWorking(false);
  }

  return (
    <main className="admin-users-page">
      <header className="admin-users-header">
        <a href="/admin" className="admin-users-back">← Сайтын админ</a>
        <div>
          <span className="admin-auth-kicker">ACCESS MANAGEMENT</span>
          <h1>Админ хэрэглэгчид</h1>
          <p>Сайтын агуулга удирдах хүмүүсийг урьж, нэвтрэх эрхийг нь хянаарай.</p>
        </div>
        <span className="admin-owner-chip"><strong>{session?.name}</strong><small>Үндсэн админ</small></span>
      </header>

      <section className="admin-invite-card" aria-labelledby="invite-title">
        <div>
          <span className="admin-step">01</span>
          <h2 id="invite-title">Шинэ админ урих</h2>
          <p>Уригдсан хэрэглэгч Website Content Editor эрхээр үнэ, зураг болон сайтын агуулгыг засна.</p>
        </div>
        <form onSubmit={invite}>
          <label htmlFor="invite-email">И-мэйл хаяг</label>
          <div>
            <input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.mn" required />
            <button type="submit" disabled={working || !inviteEnabled}>{working ? "Түр хүлээнэ үү…" : "Урилга илгээх"}</button>
          </div>
          {!inviteEnabled ? <small>Directus дээр Website Content Editor эрх үүссэний дараа урилга идэвхжинэ.</small> : null}
        </form>
      </section>

      {error ? <div className="admin-users-alert error" role="alert">{error}</div> : null}
      {message ? <div className="admin-users-alert success" role="status">{message}</div> : null}

      <section className="admin-users-list" aria-labelledby="admin-list-title">
        <div className="admin-users-list-head">
          <div><span className="admin-step">02</span><h2 id="admin-list-title">Нэвтрэх эрхтэй админы жагсаалт</h2></div>
          <button type="button" onClick={loadUsers} disabled={loading || working}>Шинэчлэх</button>
        </div>
        {loading ? <p className="admin-users-empty">Хэрэглэгчдийн мэдээллийг ачаалж байна…</p> : null}
        {!loading && !users.length ? <p className="admin-users-empty">Одоогоор харуулах админ хэрэглэгч алга.</p> : null}
        <div className="admin-user-grid">
          {users.map((user) => {
            const isOwner = user.role.toLowerCase() === "administrator";
            const active = user.status === "active";
            return (
              <article className="admin-user-card" key={user.id}>
                <div className="admin-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
                <div className="admin-user-copy">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <div><span className={`admin-status ${user.status}`}>{user.status === "invited" ? "Урилга хүлээгдэж байна" : active ? "Идэвхтэй" : "Идэвхгүй"}</span><span>{isOwner ? "Үндсэн админ" : "Контент админ"}</span></div>
                </div>
                {!isOwner ? <button type="button" onClick={() => changeStatus(user)} disabled={working || user.status === "invited"}>{active ? "Түр идэвхгүй болгох" : user.status === "invited" ? "Урилга илгээсэн" : "Идэвхжүүлэх"}</button> : <span className="admin-protected">Хамгаалагдсан</span>}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
