(() => {
  if (new URLSearchParams(location.search).get("admin") === "1") return;

  const SESSION_KEY = "ibex-home-ai-session-v1";
  const CONSENT_KEY = "ibex-home-ai-consent-2026-09-r1";
  const copy = {
    mn: {
      name: "iBeX Home AI",
      scope: "Хэрэглэгчийн ба маркетингийн туслах",
      safe: "iBeX Intelligent AI-аас тусдаа",
      open: "Home AI",
      hint: "24/7 хэрэглэгчийн туслах",
      hello: "Сайн байна уу. Би бүтээгдэхүүн, багц, демо, тусламж болон нууцлалын талаар iBeX-ийн баталгаажсан нийтэд нээлттэй материалаас хариулна.",
      placeholder: "iBeX-ийн талаар асуух…",
      send: "Илгээх",
      close: "Home AI хаах",
      sources: "БАТАЛГААЖСАН ЭХ СУРВАЛЖ",
      consent: "Асуулт болон сүүлийн 6 мессежийг OpenAI-р боловсруулахыг зөвшөөрч байна.",
      privacy: "Нууц үг, API key болон байгууллагын нууц өгөгдөл бүү оруулна уу.",
      policy: "Нууцлалын бодлого",
      status: "Зөвхөн нийтэд нээлттэй мэдлэг · Гадагш үйлдэл хийхгүй",
      thinking: "Баталгаажсан эх сурвалжаас хайж байна…",
      error: "Одоогоор хариулт авах боломжгүй байна. Түр хүлээгээд дахин оролдоно уу.",
      quota: "Шударга хэрэглээний хязгаар түр үйлчилж байна. Дараа дахин оролдоно уу.",
      suggest: ["iBeX Home AI гэж юу вэ?", "Багц хэрхэн сонгох вэ?", "Демо авах хүсэлтэй байна"],
    },
    en: {
      name: "iBeX Home AI",
      scope: "Customer & marketing assistant",
      safe: "Separate from iBeX Intelligent AI",
      open: "Home AI",
      hint: "24/7 customer assistant",
      hello: "Hello. I answer product, plan, demo, support and privacy questions using approved public iBeX materials.",
      placeholder: "Ask about iBeX…",
      send: "Send",
      close: "Close Home AI",
      sources: "APPROVED SOURCES",
      consent: "I consent to OpenAI processing my question and the latest 6 chat messages.",
      privacy: "Do not enter passwords, API keys or confidential organization data.",
      policy: "Privacy policy",
      status: "Public knowledge only · No external actions",
      thinking: "Searching approved sources…",
      error: "The assistant is temporarily unavailable. Please try again shortly.",
      quota: "The fair-use limit is temporarily active. Please try again later.",
      suggest: ["What is iBeX Home AI?", "How are plans selected?", "I would like an iBeX demo"],
    },
  };

  function sessionValue() {
    try {
      let value = sessionStorage.getItem(SESSION_KEY);
      if (!value) {
        value = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch {
      return crypto.randomUUID();
    }
  }

  const root = document.createElement("div");
  root.className = "ibex-assistant";
  root.innerHTML = `
    <button class="assistant-launch" type="button" aria-expanded="false">
      <span class="assistant-launch-icon">AI</span>
      <span class="assistant-launch-copy"><strong></strong><small></small></span>
    </button>
    <section class="assistant-panel" hidden role="dialog" aria-modal="false">
      <header class="assistant-head">
        <span class="assistant-avatar"><i>iBe</i><b>X</b></span>
        <span class="assistant-head-copy"><strong></strong><small></small><span class="assistant-safe"><i></i><b></b></span></span>
        <button class="assistant-close" type="button">×</button>
      </header>
      <div class="assistant-boundary"></div>
      <div class="assistant-messages" aria-live="polite"></div>
      <div class="assistant-suggestions"></div>
      <form class="assistant-form">
        <label class="assistant-consent"><input type="checkbox"><span></span></label>
        <textarea rows="1" maxlength="1200"></textarea>
        <button class="assistant-send" type="submit">↑</button>
        <span class="assistant-footnote"><span></span><a href="/privacy" target="_top"></a></span>
      </form>
    </section>`;
  document.body.appendChild(root);

  const launch = root.querySelector(".assistant-launch");
  const panel = root.querySelector(".assistant-panel");
  const close = root.querySelector(".assistant-close");
  const messages = root.querySelector(".assistant-messages");
  const suggestions = root.querySelector(".assistant-suggestions");
  const form = root.querySelector(".assistant-form");
  const input = root.querySelector("textarea");
  const send = root.querySelector(".assistant-send");
  const consent = root.querySelector(".assistant-consent input");
  const history = [];
  const sessionId = sessionValue();
  let busy = false;
  let welcomed = false;

  const lang = () => document.documentElement.lang === "en" ? "en" : "mn";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;",
  })[character]);
  const safeRelativeHref = (value) => /^\/[a-z0-9/_?=&.-]*$/i.test(String(value || "")) ? String(value) : "/register";

  function addMessage(type, text, sources = [], handoff = null) {
    const element = document.createElement("article");
    element.className = `assistant-message ${type}`;
    const sourceHtml = sources.length ? `
      <div class="assistant-sources">
        <span>${copy[lang()].sources}</span>
        ${sources.map((source) => {
          const body = `<strong>${escapeHtml(source.title)}</strong><small>${escapeHtml(source.label)} · v${escapeHtml(source.version)} · ${escapeHtml(source.stage)}</small>`;
          return source.url
            ? `<a class="assistant-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${body}</a>`
            : `<span class="assistant-source">${body}</span>`;
        }).join("")}
      </div>` : "";
    const handoffHtml = handoff?.required ? `<a class="assistant-handoff" href="${safeRelativeHref(handoff.href)}" target="_top">${escapeHtml(handoff.label)} <b>→</b></a>` : "";
    element.innerHTML = `<div>${escapeHtml(text)}</div>${sourceHtml}${handoffHtml}`;
    messages.appendChild(element);
    messages.scrollTop = messages.scrollHeight;
    return element;
  }

  function consentEnabled() {
    return consent.checked === true;
  }

  function syncConsent() {
    try {
      sessionStorage.setItem(CONSENT_KEY, consentEnabled() ? "accepted" : "declined");
    } catch {}
    input.disabled = !consentEnabled() || busy;
    send.disabled = !consentEnabled() || busy;
    suggestions.querySelectorAll("button").forEach((button) => { button.disabled = !consentEnabled() || busy; });
  }

  function applyLanguage() {
    const text = copy[lang()];
    root.querySelector(".assistant-launch-copy strong").textContent = text.open;
    root.querySelector(".assistant-launch-copy small").textContent = text.hint;
    root.querySelector(".assistant-head-copy > strong").textContent = text.name;
    root.querySelector(".assistant-head-copy > small").textContent = text.scope;
    root.querySelector(".assistant-safe b").textContent = text.safe;
    root.querySelector(".assistant-boundary").textContent = text.status;
    root.querySelector(".assistant-consent span").textContent = text.consent;
    root.querySelector(".assistant-footnote span").textContent = text.privacy;
    root.querySelector(".assistant-footnote a").textContent = text.policy;
    input.placeholder = text.placeholder;
    send.setAttribute("aria-label", text.send);
    close.setAttribute("aria-label", text.close);
    launch.setAttribute("aria-label", text.open);
    suggestions.innerHTML = text.suggest.map((question) => `<button type="button">${escapeHtml(question)}</button>`).join("");
    if (!welcomed) {
      addMessage("bot", text.hello);
      welcomed = true;
    }
    syncConsent();
  }

  function toggle(force) {
    const open = force ?? panel.hidden;
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", String(open));
    if (open) setTimeout(() => (consentEnabled() ? input : consent).focus(), 30);
  }

  async function ask(question) {
    const trimmed = question.trim();
    if (busy || !trimmed || !consentEnabled()) return;
    busy = true;
    syncConsent();
    addMessage("user", trimmed);
    input.value = "";
    const priorHistory = history.slice(-6);
    history.push({ role: "user", content: trimmed.slice(0, 800) });
    const thinking = addMessage("bot thinking", copy[lang()].thinking);
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, lang: lang(), sessionId, consent: true, history: priorHistory }),
      });
      const payload = await response.json();
      thinking.remove();
      if (!response.ok) {
        if (response.status === 429) addMessage("bot", payload.error || copy[lang()].quota);
        else addMessage("bot", payload.answer || payload.error || copy[lang()].error);
        return;
      }
      addMessage("bot", payload.answer, payload.sources || [], payload.handoff);
      history.push({ role: "assistant", content: String(payload.answer || "").slice(0, 800) });
      history.splice(0, Math.max(0, history.length - 6));
    } catch {
      thinking.remove();
      addMessage("bot", copy[lang()].error);
    } finally {
      busy = false;
      syncConsent();
      if (consentEnabled()) input.focus();
    }
  }

  function registerWebMcpTool() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    try {
      void Promise.resolve(context.registerTool({
        name: "start_ibex_home_ai",
        title: "Open iBeX Home AI",
        description: "Open the visible iBeX Home customer assistant and optionally prepare a question. This does not submit the question or perform an external action.",
        inputSchema: {
          type: "object",
          properties: { question: { type: "string", maxLength: 1200 } },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(value) {
          if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid input");
          if (Object.keys(value).some((key) => key !== "question")) throw new Error("Unsupported field");
          if (value.question !== undefined && typeof value.question !== "string") throw new Error("Question must be a string");
          toggle(true);
          if (value.question) input.value = value.question.trim().slice(0, 1200);
          return { opened: true, questionSubmitted: false, consentRequired: !consentEnabled() };
        },
      })).catch(() => {});
    } catch {}
  }

  try { consent.checked = sessionStorage.getItem(CONSENT_KEY) === "accepted"; } catch {}
  consent.addEventListener("change", syncConsent);
  launch.addEventListener("click", () => toggle());
  close.addEventListener("click", () => toggle(false));
  form.addEventListener("submit", (event) => { event.preventDefault(); void ask(input.value); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });
  suggestions.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) void ask(button.textContent || "");
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !panel.hidden) toggle(false); });
  new MutationObserver(applyLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  applyLanguage();
  registerWebMcpTool();
})();
