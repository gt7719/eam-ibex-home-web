"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";

type AdminPermission = "navigation.manage" | "pricing.manage" | "partners.manage" | "people.manage" | "knowledge.manage" | "social.manage" | "accounts.manage" | "media.upload";

const permissionOptions: Array<{ id: AdminPermission; label: string; labelEn: string; detail: string; detailEn: string }> = [
  { id: "navigation.manage", label: "Толгой цэсний мэдээлэл", labelEn: "Header menu content", detail: "Бүтээгдэхүүн, Шийдэл, Салбар, AI хөгжүүлэлт, Танилцуулга", detailEn: "Product, Solutions, Industries, AI Development and Resources" },
  { id: "pricing.manage", label: "Үнэ ба багц", labelEn: "Pricing and packages", detail: "Багц, үнэ, хэрэглэгч болон хөрөнгийн хязгаар", detailEn: "Package, price, user and asset limits" },
  { id: "partners.manage", label: "Хамтрагч байгууллага", labelEn: "Partner organizations", detail: "Байгууллагын мэдээлэл, лого, холбоос", detailEn: "Organization details, logo and links" },
  { id: "people.manage", label: "Төслийн баг", labelEn: "Project team", detail: "Багийн гишүүн, албан тушаал, танилцуулга", detailEn: "Team members, roles and profiles" },
  { id: "knowledge.manage", label: "AI мэдлэгийн сан", labelEn: "AI knowledge base", detail: "Сайтын туслахын баталгаажсан эх сурвалж, төлөв ба хувилбар", detailEn: "Approved sources, status and versions for the site assistant" },
  { id: "social.manage", label: "Мэдээ ба контент", labelEn: "News and content", detail: "Facebook пост, Reel холбоос, зураг болон нийтлэх төлөв", detailEn: "Facebook posts, Reels, images and publication status" },
  { id: "accounts.manage", label: "Веб хэрэглэгчид", labelEn: "Website users", detail: "Бүртгэл, баталгаажуулалт болон хэрэглэгчийн төлөв", detailEn: "Registration, verification and account status" },
  { id: "media.upload", label: "Медиа файл", labelEn: "Media files", detail: "Зураг, видео болон PDF файл байршуулах", detailEn: "Upload images, videos and PDF files" },
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
  const { t } = useSiteLanguage();
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
      setError(payload.error || "Админ хэрэглэгчдийн мэдээллийг уншиж чадсангүй. / Could not load administrators.");
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
      setError(payload.error || t("Урилга илгээж чадсангүй.", "Could not create the administrator."));
      setWorking(false);
      return;
    }
    setEmail("");
    setName("");
    setPassword("");
    setInvitePermissions(defaultPermissions);
    setMessage(t("Контент админы бүртгэлийг үүсгэлээ. Түр нууц үгийг хэрэглэгчид аюулгүй сувгаар дамжуулна уу.", "The content administrator was created. Share the temporary password through a secure channel."));
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
      setError(payload.error || t("Админы эрхийн хүрээг хадгалж чадсангүй.", "Could not save administrator permissions."));
      setWorking(false);
      return;
    }
    setMessage(t(`${user.name} админы эрхийн хүрээг шинэчиллээ.`, `Permissions for ${user.name} were updated.`));
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
      setError(payload.error || t("Хэрэглэгчийн төлөвийг өөрчилж чадсангүй.", "Could not change the administrator status."));
      setWorking(false);
      return;
    }
    setMessage(status === "active" ? t("Админ хэрэглэгчийг идэвхжүүллээ.", "The administrator was activated.") : t("Админ хэрэглэгчийг түр идэвхгүй болголоо.", "The administrator was suspended."));
    await loadUsers();
    setWorking(false);
  }

  return (
    <main className="admin-users-page">
      <header className="admin-users-header">
        <a href="/admin" className="admin-users-back">← {t("Сайтын админ", "Site administration")}</a>
        <div>
          <span className="admin-auth-kicker">ACCESS MANAGEMENT</span>
          <h1>{t("Админ хэрэглэгчид", "Administrators")}</h1>
          <p>{t("Сайтын агуулга удирдах хүмүүсийг урьж, нэвтрэх эрхийг нь хянаарай.", "Create site content administrators and control their access.")}</p>
        </div>
        <span className="admin-owner-chip"><strong>{session?.name}</strong><small>{t("Үндсэн админ", "Owner administrator")}</small></span>
      </header>

      <section className="admin-invite-card" aria-labelledby="invite-title">
        <div>
          <span className="admin-step">01</span>
          <h2 id="invite-title">{t("Шинэ контент админ нэмэх", "Add a content administrator")}</h2>
          <p>{t("Нэвтрэх мэдээллийг бүртгээд тухайн админ яг ямар хэсэгт өөрчлөлт хийхийг сонгоно.", "Enter the sign-in details and select the exact areas this administrator can change.")}</p>
        </div>
        <form onSubmit={invite}>
          <label htmlFor="invite-email">{t("Админы мэдээлэл", "Administrator details")}</label>
          <div className="admin-invite-fields">
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Нэр", "Name")} required />
            <input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.mn" required />
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("Түр нууц үг • 10+ тэмдэгт", "Temporary password • 10+ characters")} minLength={10} required />
          </div>
          <fieldset className="admin-permission-fieldset">
            <legend>{t("Өөрчлөлт хийх эрх", "Edit permissions")}</legend>
            <div className="admin-permission-grid">
              {permissionOptions.map((permission) => (
                <label className="admin-permission-option" key={permission.id}>
                  <input
                    type="checkbox"
                    checked={invitePermissions.includes(permission.id)}
                    onChange={() => toggleInvitePermission(permission.id)}
                  />
                  <span><strong>{t(permission.label, permission.labelEn)}</strong><small>{t(permission.detail, permission.detailEn)}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="admin-invite-submit"
            disabled={working || !inviteEnabled || !invitePermissions.some((permission) => permission !== "media.upload")}
          >
            {working ? t("Түр хүлээнэ үү…", "Please wait…") : t("Админ нэмэх", "Add administrator")}
          </button>
          <small>{t("Нууц үгийг и-мэйлээр автоматаар илгээхгүй. Хэрэглэгчид аюулгүй сувгаар дамжуулна уу.", "The password is not emailed automatically. Share it with the user through a secure channel.")}</small>
        </form>
      </section>

      {error ? <div className="admin-users-alert error" role="alert">{error}</div> : null}
      {message ? <div className="admin-users-alert success" role="status">{message}</div> : null}

      <section className="admin-users-list" aria-labelledby="admin-list-title">
        <div className="admin-users-list-head">
          <div><span className="admin-step">02</span><h2 id="admin-list-title">{t("Нэвтрэх эрхтэй админы жагсаалт", "Administrators with access")}</h2></div>
          <button type="button" onClick={loadUsers} disabled={loading || working}>{t("Шинэчлэх", "Refresh")}</button>
        </div>
        {loading ? <p className="admin-users-empty">{t("Хэрэглэгчдийн мэдээллийг ачаалж байна…", "Loading administrators…")}</p> : null}
        {!loading && !users.length ? <p className="admin-users-empty">{t("Одоогоор харуулах админ хэрэглэгч алга.", "There are no administrators to display.")}</p> : null}
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
                  <div><span className={`admin-status ${user.status}`}>{active ? t("Идэвхтэй", "Active") : t("Идэвхгүй", "Inactive")}</span><span>{isOwner ? t("Үндсэн админ", "Owner administrator") : t("Контент админ", "Content administrator")}</span></div>
                </div>
                {isOwner ? (
                  <div className="admin-protected-rights">
                    <span className="admin-protected">{t("Бүх эрхтэй · Хамгаалагдсан", "Full access · Protected")}</span>
                  </div>
                ) : (
                  <>
                    <fieldset className="admin-managed-permissions" disabled={working || !active}>
                      <legend>{t("Эрхийн хүрээ", "Permission scope")}</legend>
                      <div>
                        {permissionOptions.map((permission) => (
                          <label key={permission.id}>
                            <input
                              type="checkbox"
                              checked={(permissionDrafts[user.id] || []).includes(permission.id)}
                              onChange={() => toggleManagedPermission(user.id, permission.id)}
                            />
                            <span>{t(permission.label, permission.labelEn)}</span>
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
                        {t("Эрх хадгалах", "Save permissions")}
                      </button>
                      <button type="button" onClick={() => changeStatus(user)} disabled={working}>
                        {active ? t("Түр идэвхгүй болгох", "Suspend") : t("Идэвхжүүлэх", "Activate")}
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
