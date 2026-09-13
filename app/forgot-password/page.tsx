"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { TurnstileField } from "../components/turnstile-field";
import { useSiteLanguage } from "../lib/use-site-language";

export default function ForgotPasswordPage() {
  const { t } = useSiteLanguage(); const [email, setEmail] = useState(""); const [working, setWorking] = useState(false); const [turnstileToken, setTurnstileToken] = useState(""); const [securityReady, setSecurityReady] = useState(false); const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); setWorking(true); setResult(null); const response = await fetch("/api/account/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, turnstileToken }) }).catch(() => null); const payload = response ? await response.json().catch(() => ({})) : {}; setResult({ ok: Boolean(response?.ok), message: payload.message || payload.error || t("Сервертэй холбогдож чадсангүй.", "Could not connect to the server.") }); setWorking(false); }
  return <AccountShell kicker="PASSWORD RECOVERY" titleMn="Нууц үг сэргээх" titleEn="Reset password" introMn="Бүртгэлтэй и-мэйлд 30 минут хүчинтэй нэг удаагийн холбоос илгээнэ." introEn="A one-time link valid for 30 minutes will be sent to the registered email."><form className="account-form" onSubmit={submit}><label>{t("И-мэйл", "Email")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><TurnstileField onToken={setTurnstileToken} onReadyChange={setSecurityReady} />{result ? <AccountAlert type={result.ok ? "success" : "error"}>{result.message}</AccountAlert> : null}<button className="account-submit" disabled={working || !securityReady}>{working ? t("Илгээж байна…", "Sending…") : t("Сэргээх холбоос авах", "Request reset link")}</button></form><p className="account-switch"><Link href="/login">{t("Нэвтрэх рүү буцах", "Return to sign in")}</Link></p></AccountShell>;
}
