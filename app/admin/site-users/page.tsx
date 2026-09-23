"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";

type Policy = {
  emailRequired: boolean;
  phoneRequired: boolean;
  revision: string | null;
};
type VerificationReadiness = {
  email: { ready: boolean; provider: string; sender: string; replyTo: string };
  sms: { ready: boolean; provider: string; sender: string; endpointConfigured: boolean };
  turnstile: { ready: boolean };
  limits: {
    otpExpiresMinutes: number;
    resendCooldownSeconds: number;
    dailySendLimit: number;
    maximumAttempts: number;
    emailLinkExpiresHours: number;
  };
};
type DeliveryEvent = {
  channel: string;
  template: string;
  recipient_masked: string;
  provider: string;
  status: string;
  error_code: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
  user_name: string | null;
};
type Subscription = {
  id: string;
  organizationName: string;
  planId: string;
  planName: string;
  durationMonths: number;
  baseAmountMnt: number | null;
  discountAmountMnt: number;
  finalAmountMnt: number | null;
  promotion: {
    nameMn?: string;
    nameEn?: string;
    textMn?: string;
    textEn?: string;
    bonusMonths?: number;
  } | null;
  paymentStatus: string;
  subscriptionStatus: string;
  startsAt: string | null;
  endsAt: string | null;
  provisioningStatus: string;
  coreTenantId: string | null;
  coreTenantAdminId: string | null;
  coreWorkspaceUrl: string | null;
  provisionedAt: string | null;
};
type Profile = {
  percentage: number;
  missing: string[];
  hasProfileImage: boolean;
  profileImageUrl: string | null;
};
type Verification = {
  emailRequired: boolean;
  phoneRequired: boolean;
  emailComplete: boolean;
  phoneComplete: boolean;
  complete: boolean;
};
type SiteUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  phoneCountryIso: string;
  accountStatus: string;
  emailStatus: string;
  emailVerifiedAt: string | null;
  phoneStatus: string;
  phoneVerifiedAt: string | null;
  emailVerificationRequired: boolean;
  phoneVerificationRequired: boolean;
  locale: string;
  lastLoginAt: string | null;
  deletionRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: Profile;
  verification: Verification;
  subscription: Subscription | null;
};
type Detail = {
  user: Omit<SiteUser, "phone"> & { phoneE164: string };
  subscription: Subscription | null;
  events: {
    eventType: string;
    actorType: string;
    createdAt: string;
    payload: Record<string, string | number> | null;
  }[];
  deliveries: {
    channel: string;
    template: string;
    recipient_masked: string;
    provider: string;
    status: string;
    error_code: string | null;
    attempt_count: number;
    created_at: string;
  }[];
  provisioning: {
    status: string;
    attempt_count: number;
    last_attempt_at: string | null;
    delivered_at: string | null;
    created_at: string;
  }[];
};

const accountLabels: Record<string, [string, string]> = {
  pending: ["Хүлээгдэж буй", "Pending"],
  limited: ["Хязгаарлагдмал", "Limited"],
  active: ["Идэвхтэй", "Active"],
  locked: ["Түгжигдсэн", "Locked"],
  suspended: ["Түдгэлзсэн", "Suspended"],
  deletion_requested: ["Устгах хүсэлттэй", "Deletion requested"],
  deactivated: ["Идэвхгүй", "Deactivated"],
};
const subscriptionLabels: Record<string, [string, string]> = {
  payment_pending: ["Төлбөр хүлээж байна", "Payment pending"],
  quote_requested: ["Үнийн санал", "Quote requested"],
  provisioning_pending: ["eAM бэлтгэж байна", "eAM provisioning"],
  active: ["eAM идэвхтэй", "eAM active"],
  expired: ["Хугацаа дууссан", "Expired"],
};

function dateText(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "—";
}
function statusText(status: string) {
  return status.replaceAll("_", " ");
}

export default function AdminSiteUsersPage() {
  const { t } = useSiteLanguage();
  const [area, setArea] = useState<"users" | "verification" | "delivery">("users");
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryEvent[]>([]);
  const [readiness, setReadiness] = useState<VerificationReadiness | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [policy, setPolicy] = useState<Policy>({
    emailRequired: true,
    phoneRequired: false,
    revision: null,
  });
  const [savedPolicy, setSavedPolicy] = useState<Policy>({
    emailRequired: true,
    phoneRequired: false,
    revision: null,
  });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<SiteUser | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<
    "overview" | "verification" | "subscription" | "history"
  >("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/site-users", {
      cache: "no-store",
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok)
      setError(
        payload.error ||
          t("Хэрэглэгчдийг уншиж чадсангүй.", "Could not load users."),
      );
    else {
      setUsers(payload.users || []);
      setDeliveries(payload.deliveries || []);
      setReadiness(payload.verificationReadiness || null);
      const nextPolicy = payload.verificationPolicy || {
          emailRequired: true,
          phoneRequired: false,
          revision: null,
        };
      setPolicy(nextPolicy);
      setSavedPolicy(nextPolicy);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) window.top!.location.href = "/admin/login";
        else void load();
      })
      .catch(() => (window.top!.location.href = "/admin/login"));
  }, [load]);
  const policyDirty = policy.emailRequired !== savedPolicy.emailRequired || policy.phoneRequired !== savedPolicy.phoneRequired;
  useEffect(() => {
    window.parent.postMessage({ type: "ibex-admin-dirty", dirty: policyDirty }, window.location.origin);
    const warn = (event: BeforeUnloadEvent) => {
      if (!policyDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.parent.postMessage({ type: "ibex-admin-dirty", dirty: false }, window.location.origin);
    };
  }, [policyDirty]);

  function changeArea(next: "users" | "verification" | "delivery") {
    if (next === area) return;
    if (policyDirty && !window.confirm(t("Хадгалаагүй баталгаажуулалтын өөрчлөлтийг цуцлах уу?", "Discard unsaved verification changes?"))) return;
    if (policyDirty) setPolicy(savedPolicy);
    setArea(next);
  }
  const visible = useMemo(
    () =>
      users.filter(
        (user) =>
          (filter === "all" || user.accountStatus === filter) &&
          (!query.trim() ||
            `${user.fullName} ${user.email} ${user.phone} ${user.subscription?.organizationName || ""}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [users, filter, query],
  );

  async function selectUser(user: SiteUser) {
    setSelected(user);
    setDetail(null);
    setDrawerTab("overview");
    setDrawerLoading(true);
    setError("");
    const response = await fetch(
      `/api/admin/site-users/${encodeURIComponent(user.id)}`,
      { cache: "no-store" },
    ).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok)
      setError(
        payload.error ||
          t(
            "Дэлгэрэнгүй мэдээллийг уншиж чадсангүй.",
            "Could not load user details.",
          ),
      );
    else setDetail(payload as Detail);
    setDrawerLoading(false);
  }
  function closeDrawer() {
    setSelected(null);
    setDetail(null);
  }
  async function savePolicy() {
    setWorking("policy");
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/site-users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_verification_policy",
        verificationPolicy: policy,
        expectedRevision: policy.revision,
      }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok)
      setError(
        payload.error ||
          t("Бодлогыг хадгалж чадсангүй.", "Could not save the policy."),
      );
    else {
      setPolicy(payload.verificationPolicy);
      setSavedPolicy(payload.verificationPolicy);
      setMessage(
        t(
          `Бодлого хадгалагдаж, хүлээгдэж буй болон хязгаарлагдмал ${Number(payload.reconciledUsers || 0)} хэрэглэгчийн баталгаажуулалтын төлөв шинэчлэгдлээ.`,
          `The policy was saved and ${Number(payload.reconciledUsers || 0)} pending or limited account(s) were updated.`,
        ),
      );
      await load();
    }
    setWorking("");
  }
  async function changeStatus(user: SiteUser, status: string) {
    setWorking(user.id);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/site-users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, status }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok)
      setError(
        payload.error ||
          t("Төлөв өөрчилж чадсангүй.", "Could not change status."),
      );
    else {
      setMessage(
        t("Хэрэглэгчийн төлөв шинэчлэгдлээ.", "Account status updated."),
      );
      await load();
      if (selected?.id === user.id) void selectUser(user);
    }
    setWorking("");
  }
  async function subscriptionAction(
    user: SiteUser,
    action: "confirm_payment" | "retry_provisioning",
  ) {
    if (!user.subscription) return;
    setWorking(`${user.id}-${action}`);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/site-users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, subscriptionId: user.subscription.id }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok)
      setError(
        payload.error ||
          t(
            "Тенантын үйлдлийг хийж чадсангүй.",
            "Could not process the tenant action.",
          ),
      );
    else {
      setMessage(
        payload.message ||
          t("Тенантын дараалал шинэчлэгдлээ.", "Tenant queue updated."),
      );
      await load();
      if (selected?.id === user.id) void selectUser(user);
    }
    setWorking("");
  }
  const drawerUser = detail?.user || selected;
  const drawerSubscription =
    detail?.subscription || selected?.subscription || null;

  return (
    <main className="registered-users-page">
      <header>
        <span>REGISTERED USERS · HOME WEB</span>
        <h1>{t("Веб хэрэглэгчид", "Website users")}</h1>
        <p>
          {t(
            "Бүртгэл, баталгаажуулалт, багц, урамшуулал, төлбөр болон iBeX eAM тенант бэлтгэх явцыг Home Web дээр төвлөрүүлэн удирдана.",
            "Home Web centrally manages registration, verification, plans, promotions, payment and iBeX eAM tenant provisioning.",
          )}
        </p>
      </header>
      <nav className="site-user-admin-tabs" role="tablist" aria-label={t("Вэб хэрэглэгчдийн удирдлагын хэсгүүд", "Website user administration areas")}>
        <button type="button" role="tab" aria-selected={area === "users"} className={area === "users" ? "active" : ""} onClick={() => changeArea("users")}>{t("Хэрэглэгчид", "Users")}</button>
        <button type="button" role="tab" aria-selected={area === "verification"} className={area === "verification" ? "active" : ""} onClick={() => changeArea("verification")}>{t("Баталгаажуулалтын тохиргоо", "Verification settings")}</button>
        <button type="button" role="tab" aria-selected={area === "delivery"} className={area === "delivery" ? "active" : ""} onClick={() => changeArea("delivery")}>{t("Илгээлтийн түүх", "Delivery history")}</button>
      </nav>
      {area === "verification" ? <>
      <section className="verification-readiness" aria-labelledby="verification-readiness-title">
        <div className="verification-section-heading">
          <span>DELIVERY READINESS</span>
          <h2 id="verification-readiness-title">{t("Үйлчилгээний бэлэн байдал", "Service readiness")}</h2>
          <p>{t("Нууц түлхүүрүүд орчны тохиргоонд хамгаалагдана. Энд зөвхөн холболтын төлөв болон нууц бус илгээгчийн мэдээлэл харагдана.", "Secrets remain protected in the runtime environment. Only readiness and non-secret sender details are shown here.")}</p>
        </div>
        <div className="verification-readiness-grid">
          <article className={readiness?.email.ready ? "ready" : "blocked"}><span>{t("И-мэйл", "Email")}</span><strong>{readiness?.email.ready ? t("Бэлэн", "Ready") : t("Тохируулаагүй", "Not configured")}</strong><small>{readiness?.email.provider || "Resend"} · {readiness?.email.sender || "—"}</small></article>
          <article className={readiness?.sms.ready ? "ready" : "blocked"}><span>SMS</span><strong>{readiness?.sms.ready ? t("Бэлэн", "Ready") : t("Тохируулаагүй", "Not configured")}</strong><small>{readiness?.sms.provider || "HTTPS SMS connector"} · {readiness?.sms.sender || "—"}</small></article>
          <article className={readiness?.turnstile.ready ? "ready" : "blocked"}><span>TURNSTILE</span><strong>{readiness?.turnstile.ready ? t("Бэлэн", "Ready") : t("Тохируулаагүй", "Not configured")}</strong><small>{t("Бүртгэл ба сэргээх хүсэлтийн хамгаалалт", "Registration and recovery protection")}</small></article>
        </div>
        {readiness ? <dl className="verification-limits">
          <div><dt>{t("И-мэйл холбоос", "Email link")}</dt><dd>{readiness.limits.emailLinkExpiresHours} {t("цаг", "hours")}</dd></div>
          <div><dt>OTP</dt><dd>{readiness.limits.otpExpiresMinutes} {t("минут", "minutes")}</dd></div>
          <div><dt>{t("Дахин илгээх", "Resend")}</dt><dd>{readiness.limits.resendCooldownSeconds} {t("секунд", "seconds")}</dd></div>
          <div><dt>{t("Өдрийн лимит", "Daily limit")}</dt><dd>{readiness.limits.dailySendLimit}</dd></div>
          <div><dt>{t("Оролдлогын лимит", "Attempt limit")}</dt><dd>{readiness.limits.maximumAttempts}</dd></div>
        </dl> : null}
      </section>
      <section
        className="verification-policy-panel"
        aria-labelledby="verification-policy-title"
      >
        <div>
          <span>HOME WEB POLICY</span>
          <h2 id="verification-policy-title">
            {t("Баталгаажуулалтын бодлого", "Verification policy")}
          </h2>
          <p>
            {t(
              "Энэ тохиргоо нь системийн хэмжээнд үйлчилнэ. Шинэ, хүлээгдэж буй болон хязгаарлагдмал бүртгэлд шууд хэрэгжинэ; аль хэдийн идэвхтэй хэрэглэгчийн эрхийг буцаан хаахгүй.",
              "This system-wide setting immediately applies to new, pending and limited registrations. It does not revoke already active accounts.",
            )}
          </p>
        </div>
        <div className="verification-policy-controls">
          <label>
            <input
              type="checkbox"
              checked={policy.emailRequired}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  emailRequired: event.target.checked,
                }))
              }
            />
            <span>
              <strong>
                {t(
                  "И-мэйл баталгаажуулалт шаардах",
                  "Require email verification",
                )}
              </strong>
              <small>
                {t("И-мэйл холбоосоор идэвхжүүлнэ", "Activation link by email")}
              </small>
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={policy.phoneRequired}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  phoneRequired: event.target.checked,
                }))
              }
            />
            <span>
              <strong>
                {t(
                  "Утас баталгаажуулалт шаардах",
                  "Require phone verification",
                )}
              </strong>
              <small>
                {t("SMS кодоор баталгаажуулна", "Confirmation by SMS code")}
              </small>
            </span>
          </label>
          <button onClick={savePolicy} disabled={working === "policy"}>
            {working === "policy"
              ? t("Хадгалж байна…", "Saving…")
              : t("Бодлого хадгалах", "Save policy")}
          </button>
        </div>
      </section>
      </> : null}
      {area === "users" ? <>
      <section className="registered-users-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(
            "Нэр, и-мэйл, байгууллагаар хайх",
            "Search name, email or organization",
          )}
        />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">{t("Бүх төлөв", "All statuses")}</option>
          {Object.entries(accountLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label[0], label[1])}
            </option>
          ))}
        </select>
        <button onClick={load} disabled={loading}>
          {t("Шинэчлэх", "Refresh")}
        </button>
      </section>
      {error ? (
        <div className="registered-users-alert error">{error}</div>
      ) : null}
      {message ? (
        <div className="registered-users-alert success">{message}</div>
      ) : null}
      <section className="registered-users-list">
        <div className="registered-users-count">
          {loading
            ? t("Ачаалж байна…", "Loading…")
            : t(`${visible.length} хэрэглэгч`, `${visible.length} users`)}
        </div>
        {visible.map((user) => {
          const account = accountLabels[user.accountStatus] || [
            user.accountStatus,
            user.accountStatus,
          ];
          const plan = user.subscription
            ? subscriptionLabels[user.subscription.subscriptionStatus] || [
                user.subscription.subscriptionStatus,
                user.subscription.subscriptionStatus,
              ]
            : null;
          return (
            <article className="registered-user-card" key={user.id}>
              <button
                className="registered-user-identity"
                type="button"
                onClick={() => void selectUser(user)}
                aria-label={`${user.fullName} ${t("дэлгэрэнгүй", "details")}`}
              >
                <span className="registered-user-avatar">
                  {user.profile.profileImageUrl ? (
                    <img src={user.profile.profileImageUrl} alt="" />
                  ) : (
                    user.fullName.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span>
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                  <em>
                    {user.phone} · {user.phoneCountryIso}
                  </em>
                </span>
              </button>
              <div className="registered-user-status">
                <span className={`account-state ${user.accountStatus}`}>
                  {t(account[0], account[1])}
                </span>
                <small>
                  {user.verification.emailRequired
                    ? user.verification.emailComplete
                      ? `✓ ${t("И-мэйл баталгаажсан", "Email verified")}`
                      : t("И-мэйл хүлээгдэж байна", "Email pending")
                    : t("И-мэйл шаардахгүй", "Email not required")}
                </small>
                <small>
                  {user.verification.phoneRequired
                    ? user.verification.phoneComplete
                      ? `✓ ${t("Утас баталгаажсан", "Phone verified")}`
                      : t("Утас хүлээгдэж байна", "Phone pending")
                    : t("Утас шаардахгүй", "Phone not required")}
                </small>
              </div>
              <div className="registered-user-plan">
                <small>{t("Home Web багц", "Home Web plan")}</small>
                <strong>
                  {user.subscription
                    ? `${user.subscription.organizationName} · ${user.subscription.planName}`
                    : t("Багцын хүсэлтгүй", "No plan request")}
                </strong>
                <span>
                  {plan
                    ? t(plan[0], plan[1])
                    : t("Бүртгэл хүлээгдэж байна", "Registration pending")}
                </span>
              </div>
              <div className="registered-user-progress">
                <small>{t("Профайлын бүрдэлт", "Profile completeness")}</small>
                <strong>{user.profile.percentage}%</strong>
                <span className="mini-progress">
                  <i style={{ width: `${user.profile.percentage}%` }} />
                </span>
              </div>
              <div className="registered-user-actions">
                <button type="button" onClick={() => void selectUser(user)}>
                  {t("Дэлгэрэнгүй", "Details")}
                </button>
                {user.accountStatus !== "active" &&
                user.verification.complete ? (
                  <button
                    disabled={working === user.id}
                    onClick={() => changeStatus(user, "active")}
                  >
                    {t("Идэвхжүүлэх", "Activate")}
                  </button>
                ) : null}
                {user.accountStatus === "active" ||
                user.accountStatus === "limited" ? (
                  <button
                    className="warn"
                    disabled={working === user.id}
                    onClick={() => changeStatus(user, "suspended")}
                  >
                    {t("Түдгэлзүүлэх", "Suspend")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {!loading && !visible.length ? (
          <p className="registered-users-empty">
            {t("Тохирох хэрэглэгч олдсонгүй.", "No matching users.")}
          </p>
        ) : null}
      </section>
      {selected ? (
        <>
          <button
            className="user-drawer-backdrop"
            type="button"
            aria-label={t("Самбар хаах", "Close panel")}
            onClick={closeDrawer}
          />
          <aside
            className="user-detail-drawer"
            aria-modal="true"
            role="dialog"
            aria-label={t("Хэрэглэгчийн дэлгэрэнгүй", "User details")}
          >
            <header>
              <div>
                <span>HOME WEB USER</span>
                <h2>{drawerUser?.fullName || selected.fullName}</h2>
                <p>{drawerUser?.email || selected.email}</p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label={t("Хаах", "Close")}
              >
                ×
              </button>
            </header>
            {drawerLoading ? (
              <p className="drawer-loading">
                {t(
                  "Дэлгэрэнгүй мэдээллийг ачаалж байна…",
                  "Loading account details…",
                )}
              </p>
            ) : drawerUser ? (
              <>
                <section className="drawer-profile-summary">
                  <div className="drawer-avatar">
                    {drawerUser.profile.profileImageUrl ? (
                      <img
                        src={drawerUser.profile.profileImageUrl}
                        alt={drawerUser.fullName}
                      />
                    ) : (
                      drawerUser.fullName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <strong>
                      {drawerUser.profile.percentage}%{" "}
                      {t("бүрдсэн", "complete")}
                    </strong>
                    <span className="mini-progress">
                      <i
                        style={{ width: `${drawerUser.profile.percentage}%` }}
                      />
                    </span>
                    <small>
                      {drawerUser.profile.missing.length
                        ? t(
                            `${drawerUser.profile.missing.length} талбар дутуу`,
                            `${drawerUser.profile.missing.length} field(s) remaining`,
                          )
                        : t("Профайл бүрэн", "Profile complete")}
                    </small>
                  </div>
                </section>
                <nav className="user-drawer-tabs">
                  <button
                    className={drawerTab === "overview" ? "active" : ""}
                    onClick={() => setDrawerTab("overview")}
                  >
                    {t("Ерөнхий", "Overview")}
                  </button>
                  <button
                    className={drawerTab === "verification" ? "active" : ""}
                    onClick={() => setDrawerTab("verification")}
                  >
                    {t("Баталгаажуулалт", "Verification")}
                  </button>
                  <button
                    className={drawerTab === "subscription" ? "active" : ""}
                    onClick={() => setDrawerTab("subscription")}
                  >
                    {t("Багц ба tenant", "Plan & tenant")}
                  </button>
                  <button
                    className={drawerTab === "history" ? "active" : ""}
                    onClick={() => setDrawerTab("history")}
                  >
                    {t("Аудит", "Audit")}
                  </button>
                </nav>
                <div className="user-drawer-body">
                  {drawerTab === "overview" ? (
                    <>
                      <dl className="user-detail-list">
                        <div>
                          <dt>{t("Утас", "Phone")}</dt>
                          <dd>
                            {"phoneE164" in drawerUser
                              ? drawerUser.phoneE164
                              : selected.phone}
                          </dd>
                        </div>
                        <div>
                          <dt>{t("Хэл", "Language")}</dt>
                          <dd>
                            {drawerUser.locale === "en" ? "English" : "Монгол"}
                          </dd>
                        </div>
                        <div>
                          <dt>{t("Бүртгүүлсэн", "Registered")}</dt>
                          <dd>{dateText(drawerUser.createdAt)}</dd>
                        </div>
                        <div>
                          <dt>{t("Сүүлд нэвтэрсэн", "Last sign in")}</dt>
                          <dd>{dateText(drawerUser.lastLoginAt)}</dd>
                        </div>
                        <div>
                          <dt>{t("Веб эрх", "Website access")}</dt>
                          <dd>
                            <span
                              className={`account-state ${drawerUser.accountStatus}`}
                            >
                              {t(
                                (accountLabels[drawerUser.accountStatus] || [
                                  drawerUser.accountStatus,
                                ])[0],
                                (accountLabels[drawerUser.accountStatus] || [
                                  drawerUser.accountStatus,
                                ])[1],
                              )}
                            </span>
                          </dd>
                        </div>
                      </dl>
                      {drawerUser.deletionRequestedAt ? (
                        <p className="drawer-warning">
                          {t(
                            "Энэ бүртгэл устгах хүсэлттэй.",
                            "This account has a deletion request.",
                          )}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {drawerTab === "verification" ? (
                    <>
                      <p className="drawer-context">
                        {t(
                          "Шаардлагыг энэ хэрэглэгч дээр тусад нь өөрчилдөггүй. Бүртгүүлэх үед хадгалагдсан системийн бодлогыг доор харуулж байна.",
                          "Requirements are not changed per user. The system policy snapshot stored at registration is shown below.",
                        )}
                      </p>
                      <dl className="user-detail-list">
                        <div>
                          <dt>{t("И-мэйл", "Email")}</dt>
                          <dd>
                            {drawerUser.verification.emailRequired
                              ? drawerUser.verification.emailComplete
                                ? t(
                                    "Шаардлагатай · баталгаажсан",
                                    "Required · verified",
                                  )
                                : t(
                                    "Шаардлагатай · хүлээгдэж байна",
                                    "Required · pending",
                                  )
                              : t("Шаардахгүй", "Not required")}
                          </dd>
                        </div>
                        <div>
                          <dt>{t("Утас", "Phone")}</dt>
                          <dd>
                            {drawerUser.verification.phoneRequired
                              ? drawerUser.verification.phoneComplete
                                ? t(
                                    "Шаардлагатай · баталгаажсан",
                                    "Required · verified",
                                  )
                                : t(
                                    "Шаардлагатай · хүлээгдэж байна",
                                    "Required · pending",
                                  )
                              : t("Шаардахгүй", "Not required")}
                          </dd>
                        </div>
                        <div>
                          <dt>{t("И-мэйл илгээлт", "Email delivery")}</dt>
                          <dd>{drawerUser.emailStatus}</dd>
                        </div>
                        <div>
                          <dt>{t("SMS илгээлт", "SMS delivery")}</dt>
                          <dd>{drawerUser.phoneStatus}</dd>
                        </div>
                      </dl>
                    </>
                  ) : null}
                  {drawerTab === "subscription" ? (
                    <>
                      {drawerSubscription ? (
                        <>
                          <dl className="user-detail-list">
                            <div>
                              <dt>{t("Байгууллага", "Organization")}</dt>
                              <dd>{drawerSubscription.organizationName}</dd>
                            </div>
                            <div>
                              <dt>{t("Багц", "Plan")}</dt>
                              <dd>
                                {drawerSubscription.planName} ·{" "}
                                {drawerSubscription.durationMonths}{" "}
                                {t("сар", "month(s)")}
                              </dd>
                            </div>
                            <div>
                              <dt>{t("Хугацаа", "Term")}</dt>
                              <dd>
                                {dateText(drawerSubscription.startsAt)} —{" "}
                                {dateText(drawerSubscription.endsAt)}
                              </dd>
                            </div>
                            <div>
                              <dt>{t("Төлбөр", "Payment")}</dt>
                              <dd>
                                {statusText(drawerSubscription.paymentStatus)}
                              </dd>
                            </div>
                            <div>
                              <dt>{t("eAM tenant", "eAM tenant")}</dt>
                              <dd>
                                {drawerSubscription.coreTenantId ||
                                  t("Хүлээгдэж байна", "Pending")}
                              </dd>
                            </div>
                            <div>
                              <dt>{t("Provisioning", "Provisioning")}</dt>
                              <dd>
                                {statusText(
                                  drawerSubscription.provisioningStatus,
                                )}
                              </dd>
                            </div>
                          </dl>
                          {drawerSubscription.promotion ? (
                            <div className="drawer-promotion">
                              <small>
                                {t("Авсан урамшуулал", "Applied promotion")}
                              </small>
                              <strong>
                                {drawerSubscription.promotion.nameMn ||
                                  drawerSubscription.promotion.nameEn ||
                                  drawerSubscription.promotion.textMn ||
                                  drawerSubscription.promotion.textEn}
                              </strong>
                            </div>
                          ) : null}
                          <div className="drawer-actions">
                            {drawerSubscription.paymentStatus === "pending" ? (
                              <button
                                disabled={
                                  working === `${selected.id}-confirm_payment`
                                }
                                onClick={() =>
                                  subscriptionAction(
                                    selected,
                                    "confirm_payment",
                                  )
                                }
                              >
                                {t("Төлбөр батлах", "Confirm payment")}
                              </button>
                            ) : null}
                            {drawerSubscription.paymentStatus === "confirmed" &&
                            drawerSubscription.subscriptionStatus !==
                              "active" ? (
                              <button
                                disabled={
                                  working ===
                                  `${selected.id}-retry_provisioning`
                                }
                                onClick={() =>
                                  subscriptionAction(
                                    selected,
                                    "retry_provisioning",
                                  )
                                }
                              >
                                {t(
                                  "eAM руу дахин илгээх",
                                  "Retry eAM delivery",
                                )}
                              </button>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <p className="drawer-empty">
                          {t(
                            "Багцын хүсэлт байхгүй.",
                            "There is no plan request.",
                          )}
                        </p>
                      )}
                    </>
                  ) : null}
                  {drawerTab === "history" ? (
                    <>
                      <h3>{t("Бүртгэлийн аудит", "Account audit")}</h3>
                      {detail?.events.length ? (
                        <ul className="drawer-history">
                          {detail.events.map((event, index) => (
                            <li
                              key={`${event.eventType}-${event.createdAt}-${index}`}
                            >
                              <strong>{statusText(event.eventType)}</strong>
                              <span>
                                {dateText(event.createdAt)} · {event.actorType}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="drawer-empty">
                          {t(
                            "Одоогоор бүртгэлтэй үйл явдал алга.",
                            "No recorded events yet.",
                          )}
                        </p>
                      )}
                      <h3>{t("Илгээлтийн төлөв", "Delivery status")}</h3>
                      {detail?.deliveries.length ? (
                        <ul className="drawer-history">
                          {detail.deliveries.map((event, index) => (
                            <li
                              key={`${event.channel}-${event.created_at}-${index}`}
                            >
                              <strong>
                                {event.channel} · {event.status}
                              </strong>
                              <span>
                                {event.recipient_masked} ·{" "}
                                {dateText(event.created_at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="drawer-empty">
                          {t(
                            "Илгээлтийн түүх байхгүй.",
                            "No delivery history.",
                          )}
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </aside>
        </>
      ) : null}
      </> : null}
      {area === "delivery" ? <section className="delivery-history-panel" aria-labelledby="delivery-history-title">
        <div className="delivery-history-head">
          <div><span>DELIVERY AUDIT</span><h2 id="delivery-history-title">{t("Илгээлтийн түүх", "Delivery history")}</h2><p>{t("И-мэйл болон SMS илгээлтийн хамгийн сүүлийн 100 төлөв. Хүлээн авагчийн мэдээллийг далдалж харуулна.", "The latest 100 email and SMS delivery events. Recipient details remain masked.")}</p></div>
          <button type="button" onClick={load} disabled={loading}>{t("Шинэчлэх", "Refresh")}</button>
        </div>
        {error ? <div className="registered-users-alert error">{error}</div> : null}
        <div className="delivery-history-table-wrap">
          <table className="delivery-history-table">
            <thead><tr><th>{t("Огноо", "Date")}</th><th>{t("Хэрэглэгч", "User")}</th><th>{t("Суваг", "Channel")}</th><th>{t("Загвар", "Template")}</th><th>{t("Хүлээн авагч", "Recipient")}</th><th>{t("Төлөв", "Status")}</th><th>{t("Үйлчилгээ", "Provider")}</th></tr></thead>
            <tbody>{deliveries.map((event, index) => <tr key={`${event.channel}-${event.created_at}-${index}`}><td>{dateText(event.created_at)}</td><td>{event.user_name || "—"}</td><td>{event.channel.toUpperCase()}</td><td>{statusText(event.template)}</td><td>{event.recipient_masked}</td><td><span className={`delivery-state ${event.status}`}>{statusText(event.status)}</span>{event.error_code ? <small>{statusText(event.error_code)}</small> : null}</td><td>{event.provider}</td></tr>)}</tbody>
          </table>
          {!loading && !deliveries.length ? <p className="registered-users-empty">{t("Илгээлтийн түүх байхгүй.", "No delivery history.")}</p> : null}
        </div>
      </section> : null}
    </main>
  );
}
