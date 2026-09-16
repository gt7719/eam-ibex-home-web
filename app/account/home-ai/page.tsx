"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AccountAlert, AccountShell } from "../../components/account-shell";
import { useSiteLanguage } from "../../lib/use-site-language";

type Message = { role: "user" | "assistant"; content: string };

export default function HomeAiAccountPage() {
  const { t, lang } = useSiteLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/account/session", { cache: "no-store" }).then((response) => { if (!response.ok) window.location.replace(`/login?return_to=${encodeURIComponent("/account/home-ai")}`); }).catch(() => window.location.replace("/login")); }, []);
  async function ask(event: FormEvent) {
    event.preventDefault(); const question = input.trim(); if (!question || working) return;
    const history = messages.slice(-6); setInput(""); setError(""); setWorking(true); setMessages((current) => [...current, { role: "user", content: question }]);
    const response = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, lang: lang === "en" ? "en" : "mn", sessionId: `account-${crypto.randomUUID()}`, history, consent: true }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok || !payload.answer) setError(payload.error || t("Home AI одоогоор хариулж чадсангүй.", "Home AI could not answer right now."));
    else setMessages((current) => [...current, { role: "assistant", content: payload.answer }]);
    setWorking(false);
  }
  return <AccountShell kicker="MY iBEX · HOME AI" titleMn="Home AI" titleEn="Home AI" introMn="Home AI нь зөвхөн батлагдсан нийтэд зориулсан эх сурвалжаас хариулна. Таны тенантын ажлын өгөгдөл, төлбөр болон Marketing AI-д хандахгүй." introEn="Home AI answers from approved public sources only. It cannot access your tenant work data, payments, or Marketing AI.">
    <nav className="my-ibex-tabs"><Link href="/account">{t("Тойм", "Overview")}</Link><Link href="/account?tab=package">{t("Миний багц", "My plan")}</Link><span className="active">Home AI</span><Link href="/account?tab=security">{t("Бүртгэл ба аюулгүй байдал", "Account & security")}</Link></nav>
    <section className="my-ibex-panel home-ai-account"><div className="home-ai-boundary"><strong>{t("Хэрэглэгчийн туслах", "Customer assistant")}</strong><span>{t("Гадаад үйлдэл, маркетингийн сувгийг ажиллуулах болон iBeX eAM-ийн тенант өгөгдөлд хандах эрхгүй.", "It cannot execute external actions, run marketing channels, or access iBeX eAM tenant data.")}</span></div><div className="home-ai-thread" aria-live="polite">{messages.length ? messages.map((message, index) => <article key={`${message.role}-${index}`} className={message.role}><small>{message.role === "user" ? t("Та", "You") : "Home AI"}</small><p>{message.content}</p></article>) : <p className="home-ai-empty">{t("Багц, бүтээгдэхүүн, нэвтрэлт эсвэл iBeX-ийн ерөнхий боломжийн талаар асуугаарай.", "Ask about plans, products, sign-in, or general iBeX capabilities.")}</p>}</div>{error ? <AccountAlert type="error">{error}</AccountAlert> : null}<form className="home-ai-form" onSubmit={ask}><textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={1500} placeholder={t("Асуултаа бичнэ үү…", "Write your question…")} required /><button className="account-submit" type="submit" disabled={working}>{working ? t("Хариулж байна…", "Answering…") : t("Асуух", "Ask")}</button></form></section>
  </AccountShell>;
}
