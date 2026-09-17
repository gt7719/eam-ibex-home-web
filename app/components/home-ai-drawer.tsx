"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AccountAlert } from "./account-shell";
import { useSiteLanguage } from "../lib/use-site-language";

type Message = { role: "user" | "assistant"; content: string };

export function HomeAiDrawer({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const { t, lang } = useSiteLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);
  useEffect(() => {
    if (open) contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight });
  }, [messages, open]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || working) return;
    const history = messages.slice(-6);
    setInput(""); setError(""); setWorking(true);
    setMessages((current) => [...current, { role: "user", content: question }]);
    const response = await fetch("/api/assistant/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, lang: lang === "en" ? "en" : "mn", sessionId: `account-${crypto.randomUUID()}`, history, consent: true }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok || !payload.answer) setError(payload.error || t("Home AI одоогоор хариулж чадсангүй.", "Home AI could not answer right now."));
    else setMessages((current) => [...current, { role: "assistant", content: payload.answer }]);
    setWorking(false);
  }

  return <>
    <button className="account-home-ai-launch" type="button" onClick={onOpen} aria-label="Home AI"><span aria-hidden="true">AI</span><span><strong>Home AI</strong><small>{t("24/7 хэрэглэгчийн туслах", "24/7 customer assistant")}</small></span></button>
    <div className={`home-ai-drawer-layer${open ? " is-open" : ""}`} aria-hidden={!open} role="presentation" onMouseDown={onClose}>
    <aside className="home-ai-drawer" role="dialog" aria-modal="true" aria-label="Home AI" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>HOME AI</span><h2>Home AI</h2><p>{t("Зөвхөн батлагдсан нийтэд зориулсан эх сурвалжаас хариулна.", "Answers from approved public sources only.")}</p></div><button type="button" onClick={onClose} aria-label={t("Хаах", "Close")}>×</button></header>
      <div className="home-ai-drawer-content" ref={contentRef}>
        <div className="home-ai-boundary"><strong>{t("Хэрэглэгчийн туслах", "Customer assistant")}</strong><span>{t("Тенантын ажлын өгөгдөл, төлбөр, Marketing AI-д хандахгүй бөгөөд гадаад үйлдэл гүйцэтгэхгүй.", "It cannot access tenant work data, payments, Marketing AI, or execute external actions.")}</span></div>
        <div className="home-ai-messages" aria-live="polite">{messages.length ? messages.map((message, index) => <article key={`${message.role}-${index}`} className={message.role}><small>{message.role === "user" ? t("Та", "You") : "Home AI"}</small><p>{message.content}</p></article>) : <p className="home-ai-empty">{t("Багц, бүтээгдэхүүн, нэвтрэлт эсвэл iBeX-ийн ерөнхий боломжийн талаар асуугаарай.", "Ask about plans, products, sign-in, or general iBeX capabilities.")}</p>}</div>
        {error ? <AccountAlert type="error">{error}</AccountAlert> : null}
      </div>
      <form className="home-ai-drawer-form" onSubmit={ask}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} maxLength={1500} placeholder={t("Асуултаа бичнэ үү…", "Write your question…")} required aria-keyshortcuts="Enter" /><button className="account-submit" type="submit" disabled={working}>{working ? t("Хариулж байна…", "Answering…") : t("Асуух", "Ask")}</button></form>
    </aside>
    </div>
  </>;
}
