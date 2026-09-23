"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";

type AdminPermission = "navigation.manage" | "pricing.manage" | "partners.manage" | "people.manage" | "knowledge.manage" | "marketing.manage" | "social.manage" | "accounts.manage" | "media.upload";

type PermissionOption = { id: AdminPermission; label: string; labelEn: string; detail: string; detailEn: string };

const permissionGroups: Array<{ label: string; labelEn: string; options: PermissionOption[] }> = [
  { label: "Толгой цэсний мэдээлэл", labelEn: "Header menu content", options: [
    { id: "navigation.manage", label: "Толгой цэсний мэдээлэл", labelEn: "Header menu content", detail: "Бүтээгдэхүүн, Шийдэл, Салбар, AI хөгжүүлэлт, Танилцуулга", detailEn: "Product, Solutions, Industries, AI Development and Resources" },
  ] },
  { label: "Төсөл хэрэгжүүлэгчид", labelEn: "Project implementers", options: [
    { id: "partners.manage", label: "Хамтрагч байгууллагууд", labelEn: "Partner organizations", detail: "Байгууллагын мэдээлэл, лого, холбоос", detailEn: "Organization details, logo and links" },
    { id: "people.manage", label: "Төслийн баг", labelEn: "Project team", detail: "Багийн гишүүн, албан тушаал, танилцуулга", detailEn: "Team members, roles and profiles" },
  ] },
  { label: "Үнэ ба багц", labelEn: "Pricing and packages", options: [
    { id: "pricing.manage", label: "Үнэ ба багц", labelEn: "Pricing and packages", detail: "Багц, үнэ, хэрэглэгч болон хөрөнгийн хязгаар", detailEn: "Package, price, user and asset limits" },
  ] },
  { label: "AI удирдлага", labelEn: "AI management", options: [
    { id: "knowledge.manage", label: "Home AI удирдлага ба мэдлэгийн сан", labelEn: "Home AI control and knowledge", detail: "Ерөнхий AI мэдлэг, iBeX лавлагаа, төлөв, төсөв, лимит ба хувилбар", detailEn: "General AI knowledge, optional iBeX references, status, budget, limits and versions" },
    { id: "marketing.manage", label: "Marketing AI", labelEn: "Marketing AI", detail: "Кампанит ажил, lead, контент, зөвшөөрөл, төсөв ба аналитикийн командын төв", detailEn: "Command center for campaigns, leads, content, approvals, budget and analytics" },
  ] },
  { label: "Мэдээ ба контент", labelEn: "News and content", options: [
    { id: "social.manage", label: "Мэдээ ба контент", labelEn: "News and content", detail: "Facebook пост, Reel холбоос, зураг болон нийтлэх төлөв", detailEn: "Facebook posts, Reels, images and publication status" },
  ] },
  { label: "Вэб хэрэглэгчид", labelEn: "Website users", options: [
    { id: "accounts.manage", label: "Вэб хэрэглэгчид", labelEn: "Website users", detail: "Бүртгэл, баталгаажуулалтын тохиргоо, илгээлтийн түүх, туршилт ба хэрэглэгчийн төлөв", detailEn: "Registration, verification settings, delivery history, tests and account status" },
  ] },
  { label: "Нэмэлт эрх", labelEn: "Additional permissions", options: [
    { id: "media.upload", label: "Медиа файл", labelEn: "Media files", detail: "Зураг, видео болон PDF файл байршуулах", detailEn: "Upload images, videos and PDF files" },
  ] },
];

const permissionOptions = permissionGroups.flatMap((group) => group.options);

const defaultPermissions = permissionOptions.map((permission) => permission.id);

function samePermissions(left: AdminPermission[], right: AdminPermission[]) {
  return [...left].sort().join("|") === [...right].sort().join("|");
}

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
  const managedPermissionsDirty = useMemo(() => users.some((user) => !samePermissions(user.permissions || [], permissionDrafts[user.id] || [])), [permissionDrafts, users]);
  const inviteDirty = Boolean(email || name || password || !samePermissions(invitePermissions, defaultPermissions));
  const hasUnsavedChanges = inviteDirty || managedPermissionsDirty;

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

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

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

  function toggleAllInvitePermissions() {
    setInvitePermissions((current) => current.length === defaultPermissions.length ? [] : defaultPermissions);
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

  function toggleAllManagedPermissions(userId: string) {
    setPermissionDrafts((current) => ({
      ...current,
      [userId]: (current[userId] || []).length === defaultPermissions.length ? [] : defaultPermissions,
    }));
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
        <a href="/admin" className="admin-users-back" onClick={(event) => { if (hasUnsavedChanges && !window.confirm(t("Хадгалаагүй өөрчлөлтийг цуцлах уу?", "Discard unsaved changes?"))) event.preventDefault(); }}>← {t("Сайтын админ", "Site administration")}</a>
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
            <div className="admin-permission-toolbar"><span>{invitePermissions.length}/{defaultPermissions.length} {t("эрх сонгосон", "permissions selected")}</span><button type="button" onClick={toggleAllInvitePermissions}>{invitePermissions.length === defaultPermissions.length ? t("Бүгдийг цэвэрлэх", "Clear all") : t("Бүгдийг сонгох", "Select all")}</button></div>
            <div className="admin-permission-groups">
              {permissionGroups.map((group) => (
                <section className="admin-permission-group" key={group.labelEn}>
                  <h3>{t(group.label, group.labelEn)}</h3>
                  <div className="admin-permission-grid">
                    {group.options.map((permission) => (
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
                </section>
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
                      <div className="admin-permission-toolbar"><span>{(permissionDrafts[user.id] || []).length}/{defaultPermissions.length}</span><button type="button" onClick={() => toggleAllManagedPermissions(user.id)}>{(permissionDrafts[user.id] || []).length === defaultPermissions.length ? t("Бүгдийг цэвэрлэх", "Clear all") : t("Бүгдийг сонгох", "Select all")}</button></div>
                      <div className="admin-managed-permission-groups">
                        {permissionGroups.map((group) => (
                          <section key={group.labelEn}>
                            <h4>{t(group.label, group.labelEn)}</h4>
                            <div>{group.options.map((permission) => (
                              <label key={permission.id}>
                                <input
                                  type="checkbox"
                                  checked={(permissionDrafts[user.id] || []).includes(permission.id)}
                                  onChange={() => toggleManagedPermission(user.id, permission.id)}
                                />
                                <span>{t(permission.label, permission.labelEn)}</span>
                              </label>
                            ))}</div>
                          </section>
                        ))}
                      </div>
                    </fieldset>
                    <div className="admin-user-actions">
                      <button
                        type="button"
                        className="permission-save"
                        onClick={() => savePermissions(user)}
                        disabled={working || !active || samePermissions(user.permissions || [], permissionDrafts[user.id] || [])}
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
