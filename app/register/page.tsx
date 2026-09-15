"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { TurnstileField } from "../components/turnstile-field";
import { useSiteLanguage } from "../lib/use-site-language";
import { callingCodeOptions } from "../lib/calling-codes";

export default function RegisterPage() {
  const { lang, t } = useSiteLanguage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryIso, setCountryIso] = useState("MN");
  const [callingCode, setCallingCode] = useState("+976");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingSms, setMarketingSms] = useState(false);
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [securityReady, setSecurityReady] = useState(false);
  const [formStartedAt] = useState(() => Date.now());
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; emailSent?: boolean } | null>(null);
  const selected = useMemo(() => callingCodeOptions.find((country) => country[0] === countryIso), [countryIso]);

  useEffect(() => {
    fetch("/api/account/country", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      const match = callingCodeOptions.find((country) => country[0] === data.country);
      if (match) {
        setCountryIso(match[0]);
        setCallingCode(match[1]);
      }
    }).catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setResult(null);
    const response = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phoneCountryIso: countryIso, phoneCallingCode: callingCode, phoneNationalNumber: phone, password, passwordConfirm, termsAccepted: terms, privacyAccepted: privacy, marketingEmailOptIn: marketingEmail, marketingSmsOptIn: marketingSms, website, formStartedAt, locale: lang, turnstileToken }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    setResult({ ok: Boolean(response?.ok), message: payload.message || payload.error || t("Сервертэй холбогдож чадсангүй.", "Could not connect to the server."), emailSent: payload.emailSent });
    setWorking(false);
  }

  if (result?.ok) {
    return <AccountShell kicker="ACCOUNT CREATED" titleMn="Бүртгэл үүслээ" titleEn="Account created" introMn="Таны веб хэрэглэгчийн бүртгэл үндсэн iBeX системийн эрхээс тусдаа байна." introEn="Your website account is separate from access to the core iBeX system.">
      <AccountAlert type={result.emailSent === false ? "notice" : "success"}>{result.message}</AccountAlert>
      <div className="account-actions"><Link className="account-primary-link" href="/login">{t("Нэвтрэх хуудас", "Go to sign in")}</Link><Link href={`/resend-verification?email=${encodeURIComponent(email)}`}>{t("Захидал дахин илгээх", "Resend email")}</Link></div>
    </AccountShell>;
  }

  return <AccountShell variant="registration" kicker="WEBSITE ACCOUNT" titleMn="Шинэ хэрэглэгч бүртгүүлэх" titleEn="Create your account" introMn="И-мэйлээ баталгаажуулсны дараа веб бүртгэл идэвхжинэ. Утасны дугаар SMS баталгаажуулалтад бэлэн хадгалагдана." introEn="Your website account becomes active after email verification. Your mobile number is stored ready for future SMS verification.">
    <form className="account-form account-register-form" onSubmit={submit}>
      <label>{t("Овог, нэр", "Full name")}<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={160} required /></label>
      <label>{t("И-мэйл", "Email")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>
      <fieldset className="account-phone"><legend>{t("Гар утас", "Mobile phone")}</legend><div>
        <label>{t("Улсын код", "Calling code")}<select value={countryIso} onChange={(event) => { const next = callingCodeOptions.find((country) => country[0] === event.target.value); if (!next) return; setCountryIso(next[0]); setCallingCode(next[1]); }}>{callingCodeOptions.map((country) => <option value={country[0]} key={country[0]}>{country[1]} · {lang === "en" ? country[3] : country[2]}</option>)}</select></label>
        <label>{t("Утасны дугаар", "Phone number")}<input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder={selected?.[0] === "MN" ? "99112233" : ""} maxLength={20} required /></label>
      </div><small>{t("Улсын код автоматаар сонгогдоно. Шаардлагатай бол жагсаалтаас солино.", "The calling code is selected automatically. Change it from the list if needed.")}</small></fieldset>
      <div className="account-form-grid">
        <label>{t("Нууц үг", "Password")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /><small>{t("8–128 тэмдэгт • том үсэг • тоо • тусгай тэмдэгт", "8–128 characters • uppercase • number • special character")}</small></label>
        <label>{t("Нууц үг давтах", "Confirm password")}<input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      </div>
      <label className="account-check"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} required /><span><Link href="/terms" target="_blank" rel="noopener noreferrer">{t("Үйлчилгээний нөхцөл", "Terms of service")}</Link> {t("зөвшөөрч байна.", "accepted.")}</span></label>
      <label className="account-check"><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} required /><span><Link href="/privacy" target="_blank" rel="noopener noreferrer">{t("Нууцлалын бодлого", "Privacy policy")}</Link> {t("зөвшөөрч байна.", "accepted.")}</span></label>
      <div className="account-optional"><strong>{t("Сонголттой зөвшөөрөл", "Optional consent")}</strong><label className="account-check"><input type="checkbox" checked={marketingEmail} onChange={(event) => setMarketingEmail(event.target.checked)} /><span>{t("Имэйлээр бүтээгдэхүүний мэдээлэл авах", "Receive product updates by email")}</span></label><label className="account-check"><input type="checkbox" checked={marketingSms} onChange={(event) => setMarketingSms(event.target.checked)} /><span>{t("Цаашид SMS мэдээлэл авах", "Receive future SMS updates")}</span></label></div>
      <label className="account-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
      <TurnstileField onToken={setTurnstileToken} onReadyChange={setSecurityReady} />
      {result && !result.ok ? <AccountAlert type="error">{result.message}</AccountAlert> : null}
      <button type="submit" className="account-submit" disabled={working || !securityReady}>{working ? t("Бүртгэж байна…", "Creating account…") : t("Бүртгүүлэх", "Create account")}</button>
    </form>
    <p className="account-switch">{t("Бүртгэлтэй юу?", "Already registered?")} <Link href="/login">{t("Нэвтрэх", "Sign in")}</Link></p>
  </AccountShell>;
}
