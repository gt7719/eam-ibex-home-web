"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { useSiteLanguage } from "../lib/use-site-language";

export default function LoginPage() {
  const { t } = useSiteLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);

  function returnTo() {
    const value = new URLSearchParams(window.location.search).get("return_to") || "/account";
    return /^\/account(?:[/?].*)?$/.test(value) ? value : "/account";
  }

  useEffect(() => {
    fetch("/api/account/session", { cache: "no-store" }).then((response) => { if (response.ok) window.location.replace(returnTo()); }).catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true); setError(""); setUnverified(false);
    const response = await fetch("/api/account/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (response?.ok) { window.location.replace(returnTo()); return; }
    setError(payload.error || t("Сервертэй холбогдож чадсангүй.", "Could not connect to the server."));
    setUnverified(payload.code === "email_unverified");
    setWorking(false);
  }

  return <AccountShell kicker="WEBSITE ACCOUNT" titleMn="Веб хэрэглэгчийн нэвтрэлт" titleEn="Website account sign in" introMn="Энэ нэвтрэлт нь үндсэн iBeX EAM/CMMS системийн нэвтрэлтээс тусдаа." introEn="This sign-in is separate from the core iBeX EAM/CMMS platform.">
    <form className="account-form" onSubmit={submit}>
      <label>{t("И-мэйл", "Email")}<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>{t("Нууц үг", "Password")}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {error ? <AccountAlert type="error">{error}{unverified ? <><br /><Link href={`/resend-verification?email=${encodeURIComponent(email)}`}>{t("Баталгаажуулах захидал дахин илгээх", "Resend verification email")}</Link></> : null}</AccountAlert> : null}
      <button className="account-submit" type="submit" disabled={working}>{working ? t("Шалгаж байна…", "Signing in…") : t("Нэвтрэх", "Sign in")}</button>
    </form>
    <div className="account-actions"><Link href="/forgot-password">{t("Нууц үг мартсан", "Forgot password")}</Link><Link href="/register">{t("Шинээр бүртгүүлэх", "Create account")}</Link><a href="https://demo.ibex.mn">{t("Үндсэн iBeX системд нэвтрэх ↗", "Sign in to core iBeX ↗")}</a></div>
  </AccountShell>;
}
