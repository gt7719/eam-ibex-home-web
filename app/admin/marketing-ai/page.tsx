"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import "./style.css";

type SectionId =
  | "dashboard"
  | "command"
  | "leads"
  | "content"
  | "campaigns"
  | "channels"
  | "automation"
  | "approvals"
  | "budget"
  | "analytics"
  | "knowledge"
  | "integrations"
  | "audit";

type SessionUser = {
  name: string;
  permissions?: string[];
};

type ChatMessage = {
  id: string;
  role: "admin" | "assistant";
  textMn: string;
  textEn: string;
  status?: "draft" | "notice";
};

const sections: Array<{ id: SectionId; code: string; mn: string; en: string }> = [
  { id: "dashboard", code: "01", mn: "Хяналтын самбар", en: "Dashboard" },
  { id: "command", code: "02", mn: "AI командын төв", en: "AI command center" },
  { id: "leads", code: "03", mn: "Хэрэглэгч ба Lead", en: "Customers & leads" },
  { id: "content", code: "04", mn: "Контент төлөвлөгөө", en: "Content planning" },
  { id: "campaigns", code: "05", mn: "Кампанит ажил", en: "Campaigns" },
  { id: "channels", code: "06", mn: "Email ба Social", en: "Email & social" },
  { id: "automation", code: "07", mn: "Автоматжуулалт", en: "Automation" },
  { id: "approvals", code: "08", mn: "Зөвшөөрлийн төв", en: "Approval center" },
  { id: "budget", code: "09", mn: "Төсөв ба хэрэглээ", en: "Budget & usage" },
  { id: "analytics", code: "10", mn: "Аналитик ба тайлан", en: "Analytics & reports" },
  { id: "knowledge", code: "11", mn: "Мэдлэг ба загвар", en: "Knowledge & templates" },
  { id: "integrations", code: "12", mn: "Интеграц ба тохиргоо", en: "Integrations & settings" },
  { id: "audit", code: "13", mn: "Audit log", en: "Audit log" },
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    status: "notice",
    textMn: "Маркетингийн удирдлагын орчин бэлэн. Одоогоор OpenAI, email болон social сувгууд холбогдоогүй тул би зөвхөн даалгаврыг дотоод Draft төлөвөөр ангилж харуулна. Гадагш ямар ч үйлдэл хийхгүй.",
    textEn: "The marketing control workspace is ready. OpenAI, email and social channels are not connected, so commands are only classified as internal drafts. No external action is performed.",
  },
];

const workflow = [
  ["01", "Хүсэлт", "Command"],
  ["02", "Төлөвлөгөө", "Plan"],
  ["03", "Draft", "Draft"],
  ["04", "Баталгаажуулалт", "Approval"],
  ["05", "Суваг", "Channel"],
  ["06", "Үр дүн", "Result"],
];

const areaCards: Record<Exclude<SectionId, "dashboard" | "command">, Array<{ titleMn: string; titleEn: string; bodyMn: string; bodyEn: string; stateMn: string; stateEn: string }>> = {
  leads: [
    { titleMn: "Lead бүртгэл", titleEn: "Lead registry", bodyMn: "Нэр, байгууллага, салбар, сонирхол, эх үүсвэр болон харилцсан түүхийг нэг дор удирдана.", bodyEn: "Manage identity, organization, industry, interest, source and interaction history.", stateMn: "Өгөгдлийн эх үүсвэр хүлээж байна", stateEn: "Waiting for a data source" },
    { titleMn: "Зөвшөөрлийн төлөв", titleEn: "Consent status", bodyMn: "Email, SMS болон бусад маркетингийн сувгийн зөвшөөрлийг тус тусад нь шалгана.", bodyEn: "Check email, SMS and other marketing-channel consent independently.", stateMn: "Тусгаарласан", stateEn: "Separated" },
    { titleMn: "Сегмент", titleEn: "Segments", bodyMn: "Салбар, хэрэглэгчийн шат, бүтээгдэхүүний сонирхол болон үйлдлээр ангилна.", bodyEn: "Segment by industry, lifecycle stage, product interest and behavior.", stateMn: "Дүрэм тохируулаагүй", stateEn: "Rules not configured" },
  ],
  content: [
    { titleMn: "Контент календарь", titleEn: "Content calendar", bodyMn: "Facebook, website, email, богино видео болон арга хэмжээний агуулгыг нэг календарьт төлөвлөнө.", bodyEn: "Plan Facebook, website, email, short video and event content in one calendar.", stateMn: "Draft горим", stateEn: "Draft mode" },
    { titleMn: "Брэндийн хяналт", titleEn: "Brand control", bodyMn: "Албан ёсны iBeX лого, өнгө, хэл найруулга болон батлагдсан мэдээллийн дүрмийг мөрдөнө.", bodyEn: "Enforce the official iBeX logo, palette, tone and approved claims.", stateMn: "Хүний хяналттай", stateEn: "Human reviewed" },
    { titleMn: "Олон хэл", titleEn: "Multilingual", bodyMn: "Монгол үндсэн агуулгаас шаардлагатай English хувилбарыг тусдаа Draft болгон бэлтгэнэ.", bodyEn: "Create a separate English draft from Mongolian source content when required.", stateMn: "Загвар хүлээж байна", stateEn: "Waiting for templates" },
  ],
  campaigns: [
    { titleMn: "Кампанит ажлын зорилго", titleEn: "Campaign objective", bodyMn: "Зорилго, KPI, аудитори, хугацаа, контент болон сувгийг нэг төлөвлөгөөнд холбож өгнө.", bodyEn: "Connect objective, KPI, audience, timing, content and channels in one plan.", stateMn: "Идэвхтэй кампанит ажил 0", stateEn: "0 active campaigns" },
    { titleMn: "Хувилбар ба туршилт", titleEn: "Variants & tests", bodyMn: "A/B хувилбаруудыг Draft байдлаар бэлтгэж, батлагдсан хувилбарыг л ашиглана.", bodyEn: "Prepare A/B variants as drafts and use only an approved version.", stateMn: "Гадагш үйлдэл хаалттай", stateEn: "Outbound locked" },
    { titleMn: "Хариуцагч", titleEn: "Ownership", bodyMn: "Кампанит ажил бүрт эзэмшигч, батлагч болон үр дүн хариуцагчийг онооно.", bodyEn: "Assign an owner, approver and result owner to every campaign.", stateMn: "Role тохируулаагүй", stateEn: "Roles not configured" },
  ],
  channels: [
    { titleMn: "iBeX веб сайт", titleEn: "iBeX website", bodyMn: "Нийтийн сайт болон хэрэглэгчийн Home AI-тай зөвхөн зөвшөөрөгдсөн handoff өгөгдлөөр холбогдоно.", bodyEn: "Connect to the public site and Home AI only through consented handoff data.", stateMn: "Суурь бэлэн", stateEn: "Foundation ready" },
    { titleMn: "Email", titleEn: "Email", bodyMn: "Илгээгчийн домэйн, template, unsubscribe болон хүргэлтийн төлөвийг тусад нь тохируулна.", bodyEn: "Configure sender domain, templates, unsubscribe and delivery status separately.", stateMn: "Холбогдоогүй", stateEn: "Not connected" },
    { titleMn: "Social", titleEn: "Social", bodyMn: "Facebook болон дараагийн сувгууд зөвхөн OAuth/API эрх, админы баталгаажуулалтаар ажиллана.", bodyEn: "Facebook and future channels require OAuth/API authorization and admin approval.", stateMn: "Холбогдоогүй", stateEn: "Not connected" },
  ],
  automation: [
    { titleMn: "Trigger", titleEn: "Triggers", bodyMn: "Демо хүсэлт, шинэ lead, хариу өгөөгүй хугацаа, кампанит ажлын огноогоор workflow эхлүүлнэ.", bodyEn: "Start workflows from demo requests, new leads, inactivity windows or campaign dates.", stateMn: "Идэвхгүй", stateEn: "Inactive" },
    { titleMn: "Follow-up", titleEn: "Follow-up", bodyMn: "Зөвшөөрөлтэй хэрэглэгчид зориулсан follow-up Draft болон сануулгыг бэлтгэнэ.", bodyEn: "Prepare follow-up drafts and reminders for consented customers.", stateMn: "Илгээлт хаалттай", stateEn: "Sending locked" },
    { titleMn: "Escalation", titleEn: "Escalation", bodyMn: "Эрсдэл, гомдол, өндөр үнэ бүхий боломжийг хариуцсан админд шилжүүлнэ.", bodyEn: "Escalate risk, complaints and high-value opportunities to the assigned administrator.", stateMn: "Дүрэм хүлээж байна", stateEn: "Waiting for rules" },
  ],
  approvals: [
    { titleMn: "Нийтлэх зөвшөөрөл", titleEn: "Publishing approval", bodyMn: "Нийтийн пост, email, SMS болон кампанит ажил бүр нийтлэхийн өмнө баталгаажуулалт авна.", bodyEn: "Every public post, email, SMS and campaign requires approval before publication.", stateMn: "Хүлээгдэж буй 0", stateEn: "0 pending" },
    { titleMn: "Төсвийн зөвшөөрөл", titleEn: "Budget approval", bodyMn: "Батлагдсан төсвөөс давах эсвэл төлбөртэй сурталчилгаа эхлүүлэхийг үндсэн админ батална.", bodyEn: "The owner approves budget overruns and paid advertising activation.", stateMn: "Зарцуулалт хаалттай", stateEn: "Spend locked" },
    { titleMn: "Өгөгдлийн зөвшөөрөл", titleEn: "Data approval", bodyMn: "Экспорт, сегмент дамжуулах болон устгах үйлдэл тусгай зөвшөөрөл шаардана.", bodyEn: "Export, segment transfer and deletion require explicit approval.", stateMn: "Экспорт хаалттай", stateEn: "Export locked" },
  ],
  budget: [
    { titleMn: "OpenAI хэрэглээ", titleEn: "OpenAI usage", bodyMn: "Home AI болон Marketing AI-ийн төсөв, хэрэглээ, hard stop-ийг тусдаа хэмжинэ.", bodyEn: "Measure budgets, usage and hard stops separately for Home AI and Marketing AI.", stateMn: "Сарын лимит тохируулаагүй", stateEn: "Monthly limit not configured" },
    { titleMn: "Кампанит ажлын төсөв", titleEn: "Campaign budget", bodyMn: "Кампанит ажил тус бүрийн төлөвлөгөө, батлагдсан дүн болон бодит зарцуулалтыг харьцуулна.", bodyEn: "Compare planned, approved and actual spend per campaign.", stateMn: "Зарцуулалт $0", stateEn: "$0 spend" },
    { titleMn: "Зардлын хамгаалалт", titleEn: "Cost guard", bodyMn: "Анхааруулга, critical-only болон hard-stop босгыг үндсэн админ тогтооно.", bodyEn: "The owner defines warning, critical-only and hard-stop thresholds.", stateMn: "Hard stop идэвхтэй", stateEn: "Hard stop active" },
  ],
  analytics: [
    { titleMn: "Lead funnel", titleEn: "Lead funnel", bodyMn: "Сонирхол, бүртгэл, демо, санал, гэрээний шатлалын conversion-ийг хянана.", bodyEn: "Track conversion across interest, registration, demo, proposal and contract stages.", stateMn: "Өгөгдөл 0", stateEn: "0 data" },
    { titleMn: "Контентын үр дүн", titleEn: "Content performance", bodyMn: "Reach, engagement, click болон lead-д үзүүлсэн нөлөөг сувгаар харьцуулна.", bodyEn: "Compare reach, engagement, clicks and lead impact by channel.", stateMn: "Суваг хүлээж байна", stateEn: "Waiting for channels" },
    { titleMn: "Удирдлагын тайлан", titleEn: "Management report", bodyMn: "Хугацаат тайланг баталгаажсан хэмжүүрээр бэлтгэж, таамгийг бодит үр дүнгээс ялгана.", bodyEn: "Prepare periodic reports from verified metrics and separate forecasts from actuals.", stateMn: "Тайлан үүсээгүй", stateEn: "No report generated" },
  ],
  knowledge: [
    { titleMn: "Брэндийн мэдлэг", titleEn: "Brand knowledge", bodyMn: "Лого, өнгө, нэршил, дуу хоолой болон хориглосон мэдэгдлийг хяналттай хадгална.", bodyEn: "Govern logos, colors, terminology, tone and prohibited claims.", stateMn: "Эх сурвалж холбох шаардлагатай", stateEn: "Sources required" },
    { titleMn: "Контент загвар", titleEn: "Content templates", bodyMn: "Post, email, видео prompt, кампанит ажлын brief болон тайлангийн загварыг хувилбаржуулна.", bodyEn: "Version post, email, video prompt, campaign brief and report templates.", stateMn: "Загвар 0", stateEn: "0 templates" },
    { titleMn: "Баталгаажсан мэдэгдэл", titleEn: "Approved claims", bodyMn: "Зөвхөн нотолгоотой бүтээгдэхүүний онцлог, үнэ болон хэрэгжүүлэлтийн төлөвийг ашиглана.", bodyEn: "Use only evidenced product capabilities, pricing and implementation status.", stateMn: "Хүний баталгаажуулалттай", stateEn: "Human approval required" },
  ],
  integrations: [
    { titleMn: "OpenAI", titleEn: "OpenAI", bodyMn: "Marketing AI-д Home AI-аас тусдаа API төсөл, төсөв, model routing болон audit шаардлагатай.", bodyEn: "Marketing AI requires an API project, budget, model routing and audit separate from Home AI.", stateMn: "Тохируулаагүй", stateEn: "Not configured" },
    { titleMn: "Нууц мэдээллийн сан", titleEn: "Credential vault", bodyMn: "Нууц үг шууд AI-д өгөхгүй; OAuth, хязгаарлагдсан token болон server-side secret ашиглана.", bodyEn: "Never give passwords directly to AI; use OAuth, scoped tokens and server-side secrets.", stateMn: "Credential хадгалаагүй", stateEn: "No credentials stored" },
    { titleMn: "Role ба permission", titleEn: "Roles & permissions", bodyMn: "Marketing админ, батлагч, контент редактор болон зөвхөн тайлан харах эрхийг тусгаарлана.", bodyEn: "Separate marketing admin, approver, content editor and report-only access.", stateMn: "Owner only", stateEn: "Owner only" },
  ],
  audit: [
    { titleMn: "AI үйлдлийн бүртгэл", titleEn: "AI activity log", bodyMn: "Prompt, model, эх сурвалж, tool, үр дүн болон зардлын metadata-г бүртгэнэ.", bodyEn: "Record prompt, model, source, tool, outcome and cost metadata.", stateMn: "Event 0", stateEn: "0 events" },
    { titleMn: "Админы шийдвэр", titleEn: "Admin decisions", bodyMn: "Зөвшөөрсөн, татгалзсан, зассан болон нийтэлсэн үйлдлийг хэрэглэгч, цагтай нь хадгална.", bodyEn: "Record approvals, rejections, edits and publishing with user and time.", stateMn: "Шийдвэр 0", stateEn: "0 decisions" },
    { titleMn: "Өөрчлөгдөхгүй мөр", titleEn: "Immutable trail", bodyMn: "Устгах, экспортлох болон эрх өөрчлөх өндөр эрсдэлтэй үйлдлийг тусгайлан мөрдөнө.", bodyEn: "Track deletion, export and permission changes as high-risk events.", stateMn: "Суурь төлөв", stateEn: "Foundation state" },
  ],
};

function commandReply(value: string): Pick<ChatMessage, "textMn" | "textEn"> {
  const command = value.toLocaleLowerCase();
  if (/(post|контент|facebook|video|видео)/i.test(command)) return {
    textMn: "Контент төлөвлөгөөний Draft даалгавар гэж ангиллаа. Брэндийн эх сурвалж, зорилтот хэрэглэгч, суваг болон нийтлэх огноо шаардлагатай. Нийтлэх үйлдэл зөвшөөрлийн төвөөр дамжина.",
    textEn: "Classified as a draft content-planning task. Brand sources, audience, channel and publish date are required. Publication must pass through the approval center.",
  };
  if (/(lead|demo|демо|хэрэглэгч|customer)/i.test(command)) return {
    textMn: "Lead удирдлагын Draft хүсэлт гэж ангиллаа. Зөвшөөрөлтэй өгөгдлийн эх үүсвэр холбогдоогүй тул хэрэглэгчийн бодит мэдээлэл татсангүй.",
    textEn: "Classified as a draft lead-management request. No customer data was retrieved because no consented data source is connected.",
  };
  if (/(campaign|кампанит|email|имэйл|social|сошиал)/i.test(command)) return {
    textMn: "Кампанит ажлын Draft гэж ангиллаа. Аудитори, сувгийн зөвшөөрөл, төсөв болон админы баталгаажуулалтгүй тул гадагш үйлдэл хийхгүй.",
    textEn: "Classified as a campaign draft. No external action is allowed without audience consent, channel authorization, budget and admin approval.",
  };
  if (/(report|тайлан|analytics|аналитик|үр дүн)/i.test(command)) return {
    textMn: "Аналитик тайлангийн Draft гэж ангиллаа. Баталгаажсан хэмжүүрийн эх үүсвэр холбогдсоны дараа бодит үр дүнг тооцно; одоогоор тоо таамаглахгүй.",
    textEn: "Classified as an analytics-report draft. Results will be calculated after verified metric sources are connected; no numbers are invented now.",
  };
  return {
    textMn: "Даалгаврыг дотоод Draft гэж бүртгэлээ. Тохирох workflow, өгөгдлийн эрх, төсөв болон баталгаажуулалтын дүрэм тохируулагдсаны дараа ажиллуулах боломжтой.",
    textEn: "Recorded as an internal draft. It can run only after the matching workflow, data permissions, budget and approval policy are configured.",
  };
}

export default function MarketingAiPage() {
  const { lang, t } = useSiteLanguage();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [section, setSection] = useState<SectionId>("dashboard");
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  useEffect(() => {
    setEmbedded(new URLSearchParams(window.location.search).get("embedded") === "1");
    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.replace("/admin/login");
          return;
        }
        const payload = await response.json();
        const next = payload.user as SessionUser;
        const canAccess = Boolean(next.permissions?.includes("marketing.manage"));
        setUser(next);
        setAuthorized(canAccess);
        setChecking(false);
        if (!canAccess) window.location.replace("/admin");
      })
      .catch(() => window.location.replace("/admin/login"));
  }, []);

  const active = sections.find((item) => item.id === section) || sections[0];
  const cards = useMemo(() => section !== "dashboard" && section !== "command" ? areaCards[section] : [], [section]);

  function submitCommand(event: FormEvent) {
    event.preventDefault();
    const value = command.trim().slice(0, 1200);
    if (!value) return;
    const reply = commandReply(value);
    const now = Date.now();
    setMessages((current) => [
      ...current,
      { id: `admin-${now}`, role: "admin", textMn: value, textEn: value },
      { id: `assistant-${now}`, role: "assistant", status: "draft", ...reply },
    ]);
    setCommand("");
  }

  if (checking || !authorized) return <main className="marketing-ai-state">{t("Маркетингийн админ эрхийг шалгаж байна…", "Checking marketing administration access…")}</main>;

  return (
    <main className={`marketing-ai-page${embedded ? " embedded" : ""}`}>
      <header className="marketing-ai-header">
        <div>
          <span className="marketing-ai-kicker">iBeX ADMIN · MARKETING CONTROL</span>
          <h1>iBe<span>X</span> Marketing AI</h1>
          <p>{t("Маркетингийн төлөвлөлт, lead, контент, кампанит ажил, зөвшөөрөл, төсөв болон үр дүнг нэг удирдлагад хянах орчин.", "One control workspace for marketing planning, leads, content, campaigns, approvals, budget and results.")}</p>
        </div>
        <div className="marketing-ai-boundary">
          <strong><i />{t("ЗӨВХӨН АДМИН", "ADMIN ONLY")}</strong>
          <span>{user?.name}</span>
          <small>{t("Home AI болон iBeX Intelligent AI-аас тусдаа", "Separate from Home AI and iBeX Intelligent AI")}</small>
        </div>
      </header>

      <section className="marketing-ai-guard" aria-label={t("Үйлдлийн хамгаалалт", "Action safeguards")}>
        <div><strong>{t("Хяналттай суурь горим", "Controlled foundation mode")}</strong><span>{t("OpenAI, email, social болон сурталчилгааны төлбөр холбогдоогүй", "OpenAI, email, social and advertising spend are not connected")}</span></div>
        <div className="marketing-ai-locks"><span>{t("Гадагш илгээх", "Outbound")} <b>{t("ХААЛТТАЙ", "LOCKED")}</b></span><span>{t("Хүний баталгаажуулалт", "Human approval")} <b>{t("ЗААВАЛ", "REQUIRED")}</b></span></div>
      </section>

      <div className="marketing-ai-workspace">
        <aside className="marketing-ai-sidebar">
          <nav aria-label={t("Маркетинг AI цэс", "Marketing AI menu")}>
            {sections.map((item) => <button key={item.id} type="button" className={item.id === section ? "active" : ""} onClick={() => setSection(item.id)}><small>{item.code}</small><span>{t(item.mn, item.en)}</span></button>)}
          </nav>
          <footer><i /><span>{t("Бодит илгээлт идэвхгүй", "Live sending disabled")}</span></footer>
        </aside>

        <section className="marketing-ai-content">
          {section === "dashboard" ? <>
            <div className="marketing-ai-section-head"><div><span>01 · CONTROL OVERVIEW</span><h2>{t("Хяналтын самбар", "Dashboard")}</h2></div><em>{t("Суурь хувилбар", "Foundation release")}</em></div>
            <div className="marketing-ai-stats">
              <article><small>{t("Идэвхтэй кампанит ажил", "Active campaigns")}</small><strong>0</strong><span>{t("Суваг холбогдоогүй", "Channels not connected")}</span></article>
              <article><small>{t("Хүлээгдэж буй зөвшөөрөл", "Pending approvals")}</small><strong>0</strong><span>{t("Гадагш үйлдэл хаалттай", "Outbound actions locked")}</span></article>
              <article><small>{t("Холбогдсон суваг", "Connected channels")}</small><strong>1 / 4</strong><span>{t("Зөвхөн iBeX веб суурь", "iBeX website foundation only")}</span></article>
              <article><small>{t("AI сарын төсөв", "Monthly AI budget")}</small><strong>—</strong><span>{t("Тохируулаагүй · hard stop", "Not configured · hard stop")}</span></article>
            </div>
            <div className="marketing-ai-dashboard-grid">
              <article className="marketing-ai-pipeline-card">
                <div className="marketing-ai-card-head"><div><span>AGENT WORKFLOW</span><h3>{t("Хяналттай маркетингийн урсгал", "Controlled marketing workflow")}</h3></div><button type="button" onClick={() => setSection("command")}>{t("Командын төв", "Command center")} →</button></div>
                <div className="marketing-ai-pipeline">{workflow.map((step, index) => <div key={step[0]}><small>{step[0]}</small><strong>{t(step[1], step[2])}</strong>{index < workflow.length - 1 ? <b>→</b> : null}</div>)}</div>
              </article>
              <article className="marketing-ai-readiness">
                <div className="marketing-ai-card-head"><div><span>READINESS</span><h3>{t("Холболтын төлөв", "Connection status")}</h3></div></div>
                <ul><li className="ready"><span>{t("Админ permission", "Admin permission")}</span><b>{t("Бэлэн", "Ready")}</b></li><li className="ready"><span>{t("Зөвшөөрлийн gate", "Approval gate")}</span><b>{t("Бэлэн", "Ready")}</b></li><li><span>OpenAI API</span><b>{t("Холбогдоогүй", "Not connected")}</b></li><li><span>Email / Social</span><b>{t("Холбогдоогүй", "Not connected")}</b></li><li><span>{t("Сарын төсөв", "Monthly budget")}</span><b>{t("Тохируулаагүй", "Not configured")}</b></li></ul>
              </article>
            </div>
          </> : null}

          {section === "command" ? <>
            <div className="marketing-ai-section-head"><div><span>02 · ADMIN COPILOT</span><h2>{t("AI командын төв", "AI command center")}</h2></div><em>{t("Draft ангилалт", "Draft classification")}</em></div>
            <div className="marketing-ai-command-grid">
              <section className="marketing-ai-chat">
                <div className="marketing-ai-messages" aria-live="polite">
                  {messages.map((message) => <article key={message.id} className={message.role}><small>{message.role === "admin" ? t("АДМИН", "ADMIN") : "MARKETING AI"}{message.status === "draft" ? ` · ${t("DRAFT", "DRAFT")}` : ""}</small><p>{lang === "en" ? message.textEn : message.textMn}</p></article>)}
                </div>
                <div className="marketing-ai-prompts">
                  {[t("Дараагийн сарын контент төлөвлөгөө", "Next month's content plan"), t("Демо хүссэн lead-үүдийн follow-up", "Follow up demo-request leads"), t("Маркетингийн сарын тайлан", "Monthly marketing report")].map((prompt) => <button key={prompt} type="button" onClick={() => setCommand(prompt)}>{prompt}</button>)}
                </div>
                <form onSubmit={submitCommand}><textarea value={command} onChange={(event) => setCommand(event.target.value)} maxLength={1200} placeholder={t("Маркетингийн даалгавар бичих…", "Enter a marketing command…")} /><button type="submit" disabled={!command.trim()}>{t("Draft үүсгэх", "Create draft")} ↑</button></form>
              </section>
              <aside className="marketing-ai-command-rules"><span>EXECUTION POLICY</span><h3>{t("Agent-ийн үйлдлийн хязгаар", "Agent action boundary")}</h3><ul><li>{t("Шинжилгээ, төлөвлөгөө, Draft автоматаар бэлтгэж болно", "Analysis, planning and drafts may be prepared automatically")}</li><li>{t("Нийтлэх, илгээх, төсөв зарцуулахад хүн батална", "Publishing, sending and spending require human approval")}</li><li>{t("Нууц үг AI-д өгөхгүй; OAuth эсвэл хязгаарлагдсан token ашиглана", "Never give AI passwords; use OAuth or scoped tokens")}</li><li>{t("Home AI болон tenant өгөгдөлд шууд хандахгүй", "No direct access to Home AI or tenant data")}</li></ul><p>{t("Энэ дэлгэцийн Draft ангилалт session дуусахад хадгалагдахгүй. Байнгын workflow болон OpenAI ажиллагааг дараагийн тохиргоогоор идэвхжүүлнэ.", "Draft classification on this screen is not persisted after the session. Durable workflows and OpenAI execution require the next configuration stage.")}</p></aside>
            </div>
          </> : null}

          {section !== "dashboard" && section !== "command" ? <>
            <div className="marketing-ai-section-head"><div><span>{active.code} · MARKETING CONTROL</span><h2>{t(active.mn, active.en)}</h2></div><em>{t("Архитектурын суурь", "Architecture foundation")}</em></div>
            <div className="marketing-ai-area-grid">{cards.map((card) => <article key={card.titleEn}><span>{t(card.stateMn, card.stateEn)}</span><h3>{t(card.titleMn, card.titleEn)}</h3><p>{t(card.bodyMn, card.bodyEn)}</p></article>)}</div>
            <section className="marketing-ai-empty-state"><strong>{t("Бодит ажиллагаа одоогоор идэвхгүй", "Live operation is currently disabled")}</strong><p>{t("Энэ хэсгийн бүтэц, эрх болон хамгаалалтын хүрээг бэлтгэсэн. Холбогдох өгөгдлийн эх үүсвэр, API/OAuth эрх, батлагдсан төсөв болон workflow-ийн дараа бодит үйлдлийг үе шаттай идэвхжүүлнэ.", "The structure, permissions and safeguards are prepared. Live actions will be enabled in stages only after data sources, API/OAuth authorization, an approved budget and workflows are configured.")}</p></section>
          </> : null}
        </section>
      </div>
    </main>
  );
}
