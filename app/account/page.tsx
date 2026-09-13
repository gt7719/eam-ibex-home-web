"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { useSiteLanguage } from "../lib/use-site-language";

type AccountUser = { fullName: string; email: string; phoneE164: string; accountStatus: string; emailStatus: string; phoneStatus: string; emailVerifiedAt: string | null; lastLoginAt: string | null; createdAt: string };

export default function AccountPage() {
  const { t } = useSiteLanguage();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/account/session", { cache: "no-store" }).then(async (response) => { if (!response.ok) { window.location.replace("/login"); return; } const payload = await response.json(); setUser(payload.user); setLoading(false); }).catch(() => { setError(t("Бүртгэлийг уншиж чадсангүй.", "Could not load the account.")); setLoading(false); }); }, [t]);
  async function logout() { await fetch("/api/account/logout", { method: "POST" }); window.location.replace("/"); }
  async function requestDeletion() { if (!window.confirm(t("Бүртгэл устгах 30 хоногийн хүсэлт үүсгэх үү?", "Start the 30-day account deletion request?"))) return; const response = await fetch("/api/account/deletion-request", { method: "POST" }); if (response.ok) { window.alert(t("Устгах хүсэлт бүртгэгдлээ. Бүртгэлээс гарлаа.", "Deletion request recorded. You have been signed out.")); window.location.replace("/"); } else setError(t("Устгах хүсэлтийг бүртгэж чадсангүй.", "Could not record the deletion request.")); }
  return <AccountShell kicker="MY WEBSITE ACCOUNT" titleMn={user?.fullName || "Миний бүртгэл"} titleEn={user?.fullName || "My account"} introMn="Веб бүртгэлийн баталгаажуулалт болон аюулгүй байдлын төлөв." introEn="Verification and security status for your website account.">
    {loading ? <AccountAlert type="notice">{t("Бүртгэлийг ачаалж байна…", "Loading account…")}</AccountAlert> : null}
    {error ? <AccountAlert type="error">{error}</AccountAlert> : null}
    {user ? <><div className="account-status-grid"><article><small>{t("И-мэйл", "Email")}</small><strong>{user.email}</strong><span className="verified">✓ {t("Баталгаажсан", "Verified")}</span></article><article><small>{t("Гар утас", "Mobile")}</small><strong>{user.phoneE164}</strong><span className="pending">{t("SMS баталгаажуулалт хүлээгдэж байна", "SMS verification pending")}</span></article><article><small>{t("Бүртгэлийн төлөв", "Account status")}</small><strong>{user.accountStatus === "active" ? t("Идэвхтэй", "Active") : user.accountStatus}</strong><span>{t("Үндсэн iBeX эрх тусдаа", "Core iBeX access is separate")}</span></article></div><div className="account-actions"><button type="button" className="account-primary-link" onClick={logout}>{t("Гарах", "Sign out")}</button><Link href="/">{t("Нүүр хуудас", "Home")}</Link><button type="button" className="account-danger-link" onClick={requestDeletion}>{t("Бүртгэл устгах хүсэлт", "Request account deletion")}</button></div></> : null}
  </AccountShell>;
}
