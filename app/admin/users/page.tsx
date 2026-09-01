"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type AdminPermission = "pricing.manage" | "partners.manage" | "people.manage" | "knowledge.manage" | "media.upload";

const permissionOptions: Array<{ id: AdminPermission; label: string; detail: string }> = [
  { id: "pricing.manage", label: "Үнэ ба багц", detail: "Багц, үнэ, хэрэглэгч болон хөрөнгийн хязгаар" },
  { id: "partners.manage", label: "Хамтрагч байгууллага", detail: "Байгууллагын мэдээлэл, лого, холбоос" },
  { id: "people.manage", label: "Төслийн баг", detail: "Багийн гишүүн, албан тушаал, танилцуулга" },
  { id: "knowledge.manage", label: "AI мэдлэгийн сан", detail: "Сайтын туслахын баталгаажсан эх сурвалж, төлөв ба хувилбар" },
  { id: "media.upload", label: "Медиа файл", detail: "Зураг, видео болон PDF файл байршуулах" },
];

const defaultPermissions = permissionOptions.map((permission) => permission.id);

type SessionUser = {
  email: string;
  name: string;
  role: string;
  canManageAdmins: boolean;
  permissions: AdminPermission[];
};

type ManagedAdmin = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: AdminPermission[];
  status: string;
  lastAccess: string | null;
};

export default function AdminUsersPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<ManagedAdmin[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<AdminPermission[]>(defaultPermissions);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<string, AdminPermission[]>>({});
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
    const nextUsers = (payload.users || []) as ManagedAdmin[];
    setUsers(nextUsers);
    setPermissionDrafts(Object.fromEntries(nextUsers.map((user) => [user.id, user.permissions || []])));
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
      body: JSON.stringify({ email, name, password, permissions: invitePermissions }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || "Урилга илгээж чадсангүй.");
      setWorking(false);
      return;
    }
    setEmail("");
    setName("");
    setPassword("");
    setInvitePermissions(defaultPermissions);
    setMessage("Контент админы бүртгэлийг үүсгэлээ. Түр нууц үгийг хэрэглэгчид аюулгүй сувгаар дамжуулна уу.");
    await loadUsers();
    setWorking(false);
  }

  function toggleInvitePermission(permission: AdminPermission) {
    setInvitePermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  function toggleManagedPermission(userId: string, permission: AdminPermission) {
    setPermissionDrafts((current) => {
      const permissions = current[userId] || [];
      return {
        ...current,
        [userId]: permissions.includes(permission)
          ? permissions.filter((item) => item !== permission)
          : [...permissions, permission],
      };
    });
  }

  async function savePermissions(user: ManagedAdmin) {
    const permissions = permissionDrafts[user.id] || [];
    setWorking(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, permissions }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || "Админы эрхийн хүрээг хадгалж чадсангүй.");
      setWorking(false);
      return;
    }
    setMessage(`${user.name} админы эрхийн хүрээг шинэчиллээ.`);
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
          <h2 id="invite-title">Шинэ контент админ нэмэх</h2>
          <p>Нэвтрэх мэдээллийг бүртгээд тухайн админ яг ямар хэсэгт өөрчлөлт хийхийг сонгоно.</p>
        </div>
        <form onSubmit={invite}>
          <label htmlFor="invite-email">Админы мэдээлэл</label>
          <div className="admin-invite-fields">
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Нэр" required />
            <input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.mn" required />
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Түр нууц үг • 10+ тэмдэгт" minLength={10} required />
          </div>
          <fieldset className="admin-permission-fieldset">
            <legend>Өөрчлөлт хийх эрх</legend>
            <div className="admin-permission-grid">
              {permissionOptions.map((permission) => (
                <label className="admin-permission-option" key={permission.id}>
                  <input
                    type="checkbox"
                    checked={invitePermissions.includes(permission.id)}
                    onChange={() => toggleInvitePermission(permission.id)}
                  />
                  <span><strong>{permission.label}</strong><small>{permission.detail}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="admin-invite-submit"
            disabled={working || !inviteEnabled || !invitePermissions.some((permission) => permission !== "media.upload")}
          >
            {working ? "Түр хүлээнэ үү…" : "Админ нэмэх"}
          </button>
          <small>Нууц үгийг и-мэйлээр автоматаар илгээхгүй. Хэрэглэгчид аюулгүй сувгаар дамжуулна уу.</small>
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
            const isOwner = user.role.toLowerCase() === "owner";
            const active = user.status === "active";
            return (
              <article className="admin-user-card" key={user.id}>
                <div className="admin-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
                <div className="admin-user-copy">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <div><span className={`admin-status ${user.status}`}>{active ? "Идэвхтэй" : "Идэвхгүй"}</span><span>{isOwner ? "Үндсэн админ" : "Контент админ"}</span></div>
                </div>
                {isOwner ? (
                  <div className="admin-protected-rights">
                    <span className="admin-protected">Бүх эрхтэй · Хамгаалагдсан</span>
                  </div>
                ) : (
                  <>
                    <fieldset className="admin-managed-permissions" disabled={working || !active}>
                      <legend>Эрхийн хүрээ</legend>
                      <div>
                        {permissionOptions.map((permission) => (
                          <label key={permission.id}>
                            <input
                              type="checkbox"
                              checked={(permissionDrafts[user.id] || []).includes(permission.id)}
                              onChange={() => toggleManagedPermission(user.id, permission.id)}
                            />
                            <span>{permission.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="admin-user-actions">
                      <button
                        type="button"
                        className="permission-save"
                        onClick={() => savePermissions(user)}
                        disabled={working || !active}
                      >
                        Эрх хадгалах
                      </button>
                      <button type="button" onClick={() => changeStatus(user)} disabled={working}>
                        {active ? "Түр идэвхгүй болгох" : "Идэвхжүүлэх"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
