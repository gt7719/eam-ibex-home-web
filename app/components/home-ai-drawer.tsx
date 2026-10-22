"use client";
import { chatSessionId } from "../lib/chat-session-id";
import { apiMessage } from "../lib/api-message";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AccountAlert } from "./account-shell";
import { useSiteLanguage } from "../lib/use-site-language";

type Message = { role: "user" | "assistant"; content: string; sources?: Array<{ title: string; url: string }>; handoff?: { required: boolean; href: string; label: string } };

export function HomeAiDrawer({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const { t, lang } = useSiteLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [quotaResetsAt, setQuotaResetsAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [acceptingPrivacy, setAcceptingPrivacy] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef("");
  const historyLoadedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  function resizeComposer(element: HTMLTextAreaElement) {
    element.style.height = "44px";
    element.style.height = `${Math.min(element.scrollHeight, 112)}px`;
  }

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!sessionIdRef.current) sessionIdRef.current = chatSessionId();
  }, []);
  useEffect(() => {
    if (!open || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    setLoadingHistory(true);
    fetch("/api/account/home-ai-history", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) }))
      .then(({ response, payload }) => {
        if (!response.ok || !Array.isArray(payload.messages)) throw new Error("history_unavailable");
        setPrivacyRequired(payload.privacyCurrent === false);
        if (Number.isFinite(Number(payload.retentionDays))) setRetentionDays(Number(payload.retentionDays));
        setMessages(payload.messages.filter((message: Message) =>
          (message?.role === "user" || message?.role === "assistant") && typeof message.content === "string",
        ));
      })
      .catch(() => {
        historyLoadedRef.current = false;
        setError(t("Өмнөх яриаг ачаалж чадсангүй. Дахин нээгээд оролдоно уу.", "Previous messages could not be loaded. Please reopen Home AI and try again."));
      })
      .finally(() => setLoadingHistory(false));
  }, [open, t]);
  useEffect(() => {
    if (!open) {
      document.body.classList.remove("home-ai-modal-open");
      return;
    }
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add("home-ai-modal-open");
    const focusFrame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>(".home-ai-header-actions button:last-child")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const choices = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea:not(:disabled),input:not(:disabled),[tabindex="0"]')).filter(element => element.getClientRects().length);
      const first = choices[0], last = choices.at(-1);
      if (!first) return;
      if (!dialogRef.current.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("home-ai-modal-open");
      previouslyFocused?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (open) contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!quotaResetsAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((quotaResetsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (!remaining) { setQuotaBlocked(false); setQuotaResetsAt(0); }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [quotaResetsAt]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || working || quotaBlocked || privacyRequired) return;
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setInput(""); if (composerRef.current) composerRef.current.style.height = "44px"; setError(""); setWorking(true);
    setMessages((current) => [...current, { role: "user", content: question }]);
    const response = await fetch("/api/assistant/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({ message: question, lang: lang === "en" ? "en" : "mn", sessionId: sessionIdRef.current, history, consent: true }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok || !payload.answer) {
      setInput(question);
      setMessages(current => current.slice(0, -1));
      setError(apiMessage(payload.error || payload.answer, lang) || t("Уучлаарай, одоогоор хариулт авах боломжгүй байна. Дахин оролдоно уу.", "Sorry, we couldn't prepare an answer. Please try again."));
      if (response?.status === 401) window.location.replace(`/login?return_to=${encodeURIComponent("/account?home_ai=1")}`);
      if (payload.code === "PRIVACY_RECONSENT_REQUIRED") setPrivacyRequired(true);
      if (response?.status === 429) {
        const retryAfter = Number(payload.retryAfterSeconds || response.headers.get("Retry-After")) || 60;
        setQuotaBlocked(true); setQuotaResetsAt(Date.now() + Math.min(2_678_400, Math.max(1, retryAfter)) * 1000);
      }
    }
    else setMessages((current) => [...current, { role: "assistant", content: payload.answer, sources: payload.sources, handoff: payload.handoff }]);
    setWorking(false);
  }

  async function clearHistory() {
    if (working || clearing || loadingHistory) return;
    if (!window.confirm(t("Home AI-ийн ярианы түүхийг цэвэрлэж, шинэ яриа эхлүүлэх үү?", "Clear Home AI history and start a new conversation?"))) return;
    setClearing(true); setError("");
    const response = await fetch("/api/account/home-ai-history", { method: "DELETE" }).catch(() => null);
    if (!response?.ok) setError(t("Ярианы түүхийг цэвэрлэж чадсангүй. Дахин оролдоно уу.", "Conversation history could not be cleared. Please try again."));
    else {
      setMessages([]);
      sessionIdRef.current = chatSessionId();
    }
    setClearing(false);
  }

  async function acceptPrivacy() {
    if (acceptingPrivacy) return;
    setAcceptingPrivacy(true); setError("");
    const response = await fetch("/api/account/privacy-consent", { method: "POST" }).catch(() => null);
    if (!response?.ok) setError(t("Нууцлалын зөвшөөрлийг хадгалж чадсангүй. Дахин оролдоно уу.", "Privacy consent could not be saved. Please try again."));
    else setPrivacyRequired(false);
    setAcceptingPrivacy(false);
  }

  return <>
    <button className="account-home-ai-launch" inert={open} type="button" onClick={onOpen} aria-label="Home AI"><span aria-hidden="true">AI</span><span><strong>Home AI</strong><small>{t("24/7 хэрэглэгчийн туслах", "24/7 customer assistant")}</small></span></button>
    <div className={`home-ai-drawer-layer${open ? " is-open" : ""}`} aria-hidden={!open} inert={!open} role="presentation" onMouseDown={onClose}>
    <aside ref={dialogRef} className="home-ai-drawer" role="dialog" aria-modal="true" aria-labelledby="home-ai-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>{t("ТАНЫ ЦАХИМ ТУСЛАХ", "YOUR DIGITAL ASSISTANT")}</span><h2 id="home-ai-title">Home AI</h2><p>{t("Танд хэрэгтэй мэдээллээ олоход тусална.", "Here to help you find the information you need.")}</p></div><div className="home-ai-header-actions"><button className="home-ai-clear" type="button" onClick={clearHistory} disabled={working || clearing || loadingHistory || messages.length === 0}>{clearing ? t("Цэвэрлэж байна…", "Clearing…") : t("Түүх цэвэрлэх", "Clear history")}</button><button type="button" onClick={onClose} aria-label={t("Хаах", "Close")}>×</button></div></header>
      <div className="home-ai-drawer-content" ref={contentRef}>
        <div className="home-ai-boundary"><strong>{t("Хэрэглэгчийн туслах", "Customer assistant")}</strong><span>{t("Бүтээгдэхүүн, багц сонголт, ашиглалтын талаар асуугаарай. Нууц мэдээллээ чатад бүү оруулаарай.", "Ask about products, choosing a plan or getting started. Please keep confidential information out of the chat.")}</span></div>
        {privacyRequired ? <div className="home-ai-privacy-consent" role="status"><strong>{t("Нууцлалын мэдэгдэл шинэчлэгдсэн", "Privacy notice updated")}</strong><p>{t(`Нэвтэрсэн хэрэглэгчийн Home AI яриа ${retentionDays} хүртэл хоног хадгалагдаж, хариулт боловсруулахдаа хамгийн ихдээ сүүлийн 6 мессежийг OpenAI-д store: false тохиргоотой илгээнэ.`, `Signed-in Home AI conversations are retained for up to ${retentionDays} days. Up to six recent messages are sent to OpenAI with store: false to prepare a response.`)}</p><a href="/privacy" target="_blank" rel="noreferrer">{t("Нууцлалын бодлого унших", "Read privacy policy")}</a><button type="button" onClick={acceptPrivacy} disabled={acceptingPrivacy}>{acceptingPrivacy ? t("Хадгалж байна…", "Saving…") : t("Зөвшөөрч үргэлжлүүлэх", "Accept and continue")}</button></div> : null}
        <div className="home-ai-messages" aria-live="polite">{loadingHistory ? <p className="home-ai-empty">{t("Өмнөх яриаг ачаалж байна…", "Loading previous conversation…")}</p> : messages.length ? messages.map((message, index) => <article key={`${message.role}-${index}`} className={message.role}><small>{message.role === "user" ? t("Та", "You") : t("Туслах", "Assistant")}</small><p>{message.content}</p>{message.sources?.filter(source => /^https:\/\//.test(source.url) || /^\/(?!\/)/.test(source.url)).map((source, index) => <a key={index} className="home-ai-source" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}{message.handoff?.required && /^\/(?!\/)/.test(message.handoff.href) ? <a href={message.handoff.href}>{message.handoff.label}</a> : null}</article>) : <p className="home-ai-empty">{t("Багц, бүтээгдэхүүн, нэвтрэлт эсвэл iBeX-ийн ерөнхий боломжийн талаар асуугаарай.", "Ask about plans, products, sign-in, or general iBeX capabilities.")}</p>}</div>
        {error ? <AccountAlert type="error">{error}</AccountAlert> : null}
        {quotaBlocked ? <p role="status">{t(`Дахин оролдох хүртэл ${secondsLeft} секунд`, `Try again in ${secondsLeft} seconds`)}</p> : null}
      </div>
      <form className="home-ai-drawer-form" onSubmit={ask}><textarea aria-label={t("Асуултаа бичих", "Your question")} ref={composerRef} rows={1} value={input} onChange={(event) => { setInput(event.target.value); resizeComposer(event.currentTarget); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} maxLength={1500} placeholder={privacyRequired ? t("Эхлээд нууцлалын мэдэгдлийг зөвшөөрнө үү", "Please accept the privacy notice first") : quotaBlocked ? t("Home AI-ийн ашиглах хугацаа шинэчлэгдэхийг хүлээж байна", "Waiting for the Home AI allowance to renew") : t("Асуултаа бичнэ үү…", "Write your question…")} required aria-keyshortcuts="Enter" disabled={working || clearing || loadingHistory || quotaBlocked || privacyRequired} /><button className="account-submit" type="submit" disabled={working || clearing || loadingHistory || quotaBlocked || privacyRequired}>{working ? t("Хариулж байна…", "Answering…") : t("Асуух", "Ask")}</button></form>
    </aside>
    </div>
  </>;
}
