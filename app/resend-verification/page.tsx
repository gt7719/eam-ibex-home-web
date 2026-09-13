"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { TurnstileField } from "../components/turnstile-field";
import { useSiteLanguage } from "../lib/use-site-language";

export default function ResendVerificationPage() {
  const { t } = useSiteLanguage();
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [securityReady, setSecurityReady] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setEmail(new URLSearchParams(window.location.search).get("email") || ""), 0); return () => window.clearTimeout(timer); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setWorking(true); setResult(null);
    const response = await fetch("/api/account/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, turnstileToken }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    setResult({ ok: Boolean(response?.ok), message: payload.message || payload.error || t("Сервертэй холбогдож чадсангүй.", "Could not connect to the server.") }); setWorking(false);
  }
  return <AccountShell kicker="EMAIL VERIFICATION" titleMn="Захидал дахин илгээх" titleEn="Resend verification email" introMn="Шинэ холбоос 24 цаг хүчинтэй. Дахин илгээх хооронд 60 секундийн хамгаалалттай." introEn="The new link is valid for 24 hours. Resends have a 60-second cooldown.">
    <form className="account-form" onSubmit={submit}><label>{t("И-мэйл", "Email")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><TurnstileField onToken={setTurnstileToken} onReadyChange={setSecurityReady} />{result ? <AccountAlert type={result.ok ? "success" : "error"}>{result.message}</AccountAlert> : null}<button className="account-submit" disabled={working || !securityReady}>{working ? t("Илгээж байна…", "Sending…") : t("Захидал илгээх", "Send email")}</button></form>
    <p className="account-switch"><Link href="/login">{t("Нэвтрэх рүү буцах", "Return to sign in")}</Link></p>
  </AccountShell>;
}
