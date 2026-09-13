"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { useSiteLanguage } from "../lib/use-site-language";

export default function VerifyEmailPage() {
  const { t } = useSiteLanguage();
  const [state, setState] = useState<"checking" | "verified" | "expired" | "invalid">("checking");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    fetch("/api/account/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const payload = await response.json().catch(() => ({})); setState(response.ok ? "verified" : payload.status === "expired" ? "expired" : "invalid"); })
      .catch(() => setState("invalid"));
  }, []);
  const message = state === "checking" ? t("Баталгаажуулж байна…", "Verifying…") : state === "verified" ? t("И-мэйл амжилттай баталгаажлаа. Таны веб бүртгэл идэвхтэй боллоо.", "Email verified. Your website account is now active.") : state === "expired" ? t("Баталгаажуулах холбоосын хугацаа дууссан байна.", "The verification link has expired.") : t("Баталгаажуулах холбоос буруу эсвэл өмнө ашиглагдсан байна.", "The verification link is invalid or has already been used.");
  return <AccountShell kicker="EMAIL VERIFICATION" titleMn="И-мэйл баталгаажуулалт" titleEn="Email verification" introMn="Баталгаажуулах холбоос нэг удаа ашиглагдана." introEn="Each verification link can be used once.">
    <AccountAlert type={state === "verified" ? "success" : state === "checking" ? "notice" : "error"}>{message}</AccountAlert>
    <div className="account-actions">{state === "verified" ? <Link className="account-primary-link" href="/login">{t("Нэвтрэх", "Sign in")}</Link> : <Link href="/resend-verification">{t("Шинэ холбоос авах", "Request a new link")}</Link>}<Link href="/">{t("Нүүр хуудас", "Home")}</Link></div>
  </AccountShell>;
}
