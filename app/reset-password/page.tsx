"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { useSiteLanguage } from "../lib/use-site-language";

export default function ResetPasswordPage() {
  const { t } = useSiteLanguage(); const [token, setToken] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [working, setWorking] = useState(false); const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setToken(new URLSearchParams(window.location.search).get("token") || ""), 0); return () => window.clearTimeout(timer); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); setWorking(true); setResult(null); const response = await fetch("/api/account/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password, passwordConfirm: confirm }) }).catch(() => null); const payload = response ? await response.json().catch(() => ({})) : {}; setResult({ ok: Boolean(response?.ok), message: response?.ok ? t("Нууц үг шинэчлэгдлээ. Бүх хуучин нэвтрэлтийг хаалаа.", "Password updated. All previous sessions were closed.") : payload.error || t("Сервертэй холбогдож чадсангүй.", "Could not connect to the server.") }); setWorking(false); }
  return <AccountShell kicker="PASSWORD RECOVERY" titleMn="Шинэ нууц үг" titleEn="Set a new password" introMn="8–128 тэмдэгттэй, том үсэг, тоо, тусгай тэмдэгт агуулсан нууц үг оруулна." introEn="Use 8–128 characters with an uppercase letter, number and special character."><form className="account-form" onSubmit={submit}><label>{t("Шинэ нууц үг", "New password")}<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>{t("Нууц үг давтах", "Confirm password")}<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>{result ? <AccountAlert type={result.ok ? "success" : "error"}>{result.message}</AccountAlert> : null}<button className="account-submit" disabled={working || result?.ok}>{working ? t("Хадгалж байна…", "Saving…") : t("Нууц үг шинэчлэх", "Update password")}</button></form>{result?.ok ? <p className="account-switch"><Link href="/login">{t("Нэвтрэх", "Sign in")}</Link></p> : null}</AccountShell>;
}
