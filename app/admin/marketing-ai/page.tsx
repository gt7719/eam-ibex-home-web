"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import type { MarketingAiControlSettings } from "../../lib/marketing-ai-control";
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

type MarketingControl = {
  settings: MarketingAiControlSettings;
  revision: string | null;
  status: { keyConfigured: boolean; tested: boolean; testedAt: string; emailConnected: boolean; socialConnected: boolean; draftReady: boolean; productionReady: boolean; outboundReady: false; humanApprovalRequired: true; budgetState: "normal" | "warning" | "critical" | "exhausted" };
  usage: { month: string; requests: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  draftCounts: Record<string, number>;
  audit: Array<{ eventType: string; model: string | null; status: string; createdAt: string }>;
};

const defaultControlSettings: MarketingAiControlSettings = {
  schemaVersion: 2, mode: "disabled", model: "gpt-5.6-luna", fastModel: "gpt-5.6-luna", detailedModel: "gpt-5.6-terra", fallbackModel: "gpt-5.6-luna",
  reasoningEffort: "medium", verbosity: "medium", defaultPromptProfile: "general", brandTone: "Мэргэжлийн, ойлгомжтой, баримтад тулгуурласан", approvedClaims: "", prohibitedClaims: "",
  monthlyBudgetUsd: 10, warningBudgetUsd: 5, criticalBudgetUsd: 8, requestsPerMinute: 4, requestsPerDay: 30, maxOutputTokens: 700,
  testedAt: "", testedFingerprint: "", testedBy: "", humanApprovalRequired: true, outboundEnabled: false,
};

type MarketingDraft = { id: string; title: string; taskType: string; promptProfile: string; promptVersion: string; model: string; content: string; missingInputs: string[]; status: "draft" | "review" | "approved" | "rejected"; revision: number; estimatedCostUsd: number; updatedAt: string; decisionNote?: string | null };

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
const sectionGroups = [
  { mn: "Ерөнхий", en: "Overview", ids: ["dashboard"] },
  { mn: "Маркетингийн ажил", en: "Marketing work", ids: ["command", "leads", "content", "campaigns"] },
  { mn: "Хяналт ба нийтлэлт", en: "Control & publishing", ids: ["channels", "automation", "approvals"] },
  { mn: "AI тохиргоо", en: "AI settings", ids: ["knowledge", "integrations", "budget"] },
  { mn: "Засаглал", en: "Governance", ids: ["analytics", "audit"] },
] as const;

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
  const [embedded] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embedded") === "1");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [section, setSection] = useState<SectionId>("dashboard");
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [control, setControl] = useState<MarketingControl | null>(null);
  const [controlSettings, setControlSettings] = useState<MarketingAiControlSettings>(defaultControlSettings);
  const [controlMessage, setControlMessage] = useState(""), [controlError, setControlError] = useState("");
  const [savingControl, setSavingControl] = useState(false), [running, setRunning] = useState(false);
  const [testingControl, setTestingControl] = useState(false);
  const [drafts, setDrafts] = useState<MarketingDraft[]>([]);
  const dirty = Boolean(control && JSON.stringify(control.settings) !== JSON.stringify(controlSettings));

  const loadControl = useCallback(async () => {
    const response = await fetch("/api/admin/marketing-ai-control", { cache: "no-store" }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (response?.ok) { setControl(payload); setControlSettings(payload.settings); }
    else if (response?.status !== 401 && response?.status !== 403) setControlError(payload.error || t("Marketing AI тохиргоог ачаалж чадсангүй.", "Could not load Marketing AI settings."));
  }, [t]);

  const loadDrafts = useCallback(async () => {
    const response = await fetch("/api/admin/marketing-ai-drafts", { cache: "no-store" }).catch(() => null);
    if (response?.ok) setDrafts((await response.json()).drafts || []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.replace("/admin/login");
          return;
        }
        const payload = await response.json();
        const next = payload.user as SessionUser;
        const canAccess = Boolean(next.permissions?.some(permission => permission.startsWith("marketing.")));
        setUser(next);
        setAuthorized(canAccess);
        setChecking(false);
        if (canAccess) { void loadControl(); void loadDrafts(); }
        if (!canAccess) window.location.replace("/admin");
      })
      .catch(() => window.location.replace("/admin/login"));
  }, [loadControl, loadDrafts]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    window.parent.postMessage({ type: "ibex-admin-dirty", dirty }, location.origin);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const hasScope = (permission: string) => Boolean(user?.permissions?.includes("marketing.manage") || user?.permissions?.includes(permission));
  const canDraft = hasScope("marketing.draft"), canApprove = hasScope("marketing.approve"), canConfigure = hasScope("marketing.settings"), canAudit = hasScope("marketing.audit");
  const visibleSections = sections.filter(item => {
    if (["command", "leads", "content", "campaigns"].includes(item.id)) return canDraft;
    if (item.id === "approvals") return canDraft || canApprove;
    if (["channels", "automation", "knowledge", "integrations", "budget"].includes(item.id)) return canConfigure;
    if (["analytics", "audit"].includes(item.id)) return canAudit;
    return true;
  });
  const active = visibleSections.find((item) => item.id === section) || visibleSections[0];
  const cards = useMemo(() => section !== "dashboard" && section !== "command" ? areaCards[section] : [], [section]);

  async function submitCommand(event: FormEvent) {
    event.preventDefault();
    const value = command.trim().slice(0, 1200);
    if (!value) return;
    const now = Date.now();
    setMessages((current) => [...current, { id: `admin-${now}`, role: "admin", textMn: value, textEn: value }]);
    setCommand("");
    if (!control?.status.draftReady || controlSettings.mode === "disabled") {
      const fallback = commandReply(value);
      setMessages((current) => [...current, { id: `assistant-${now}`, role: "assistant", status: "draft", ...fallback }]);
      return;
    }
    setRunning(true);
    const response = await fetch("/api/admin/marketing-ai-run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: value, lang }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    const text = response?.ok ? String(payload.draft || "") : String(payload.error || t("Marketing AI Draft бэлтгэж чадсангүй.", "Marketing AI could not prepare the draft."));
    setMessages((current) => [...current, { id: `assistant-${now}`, role: "assistant", status: response?.ok ? "draft" : "notice", textMn: text, textEn: text }]);
    setRunning(false);
    if (response?.ok) { void loadControl(); void loadDrafts(); }
  }

  async function saveControl(event: FormEvent) {
    event.preventDefault(); setSavingControl(true); setControlMessage(""); setControlError("");
    const response = await fetch("/api/admin/marketing-ai-control", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: controlSettings, revision: control?.revision ?? null }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setControlError(payload.error || t("Тохиргоог хадгалж чадсангүй.", "Could not save settings."));
    else { setControlMessage(t("Marketing AI тохиргоог хадгаллаа.", "Marketing AI settings saved.")); await loadControl(); }
    setSavingControl(false);
  }

  async function testControl() {
    setTestingControl(true); setControlMessage(""); setControlError("");
    if (dirty) { setControlError(t("Тестлэхийн өмнө одоогийн тохиргоог хадгална уу.", "Save the current settings before testing.")); setTestingControl(false); return; }
    const response = await fetch("/api/admin/marketing-ai-control/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setControlError(payload.error || t("Тохиргооны тест амжилтгүй.", "Configuration test failed."));
    else { setControlMessage(t(`OpenAI, ${payload.checks?.length || 0} model, code-managed prompt болон Draft хамгаалалтыг амжилттай шалгалаа.`, `OpenAI, ${payload.checks?.length || 0} models, the code-managed prompt, and draft safeguards passed.`)); await loadControl(); }
    setTestingControl(false);
  }

  async function decideDraft(draft: MarketingDraft, action: "submit" | "approve" | "reject" | "return_to_draft") {
    const note = action === "reject" ? window.prompt(t("Татгалзсан шалтгаан", "Rejection reason")) || "" : "";
    const response = await fetch("/api/admin/marketing-ai-drafts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draft.id, revision: draft.revision, action, note }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setControlError(payload.error || t("Draft төлөвийг шинэчилж чадсангүй.", "Could not update the draft status."));
    else { setControlMessage(t("Draft-ийн шийдвэрийг audit-д бүртгэлээ.", "The draft decision was recorded in the audit trail.")); await Promise.all([loadDrafts(), loadControl()]); }
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
        <div><strong>{controlSettings.mode === "production" ? t("Production Draft горим", "Production draft mode") : controlSettings.mode === "test" ? t("Test горим", "Test mode") : t("Идэвхгүй горим", "Disabled mode")}</strong><span>{control?.status.keyConfigured ? t("Тусдаа Marketing OpenAI project холбогдсон", "Separate Marketing OpenAI project connected") : t("Marketing OpenAI key хүлээж байна", "Waiting for the Marketing OpenAI key")}</span></div>
        <div className="marketing-ai-locks"><span>{t("Гадагш илгээх", "Outbound")} <b>{t("ХААЛТТАЙ", "LOCKED")}</b></span><span>{t("Хүний баталгаажуулалт", "Human approval")} <b>{t("ЗААВАЛ", "REQUIRED")}</b></span></div>
      </section>

      <div className="marketing-ai-workspace">
        <aside className="marketing-ai-sidebar">
          <nav aria-label={t("Маркетинг AI цэс", "Marketing AI menu")}>
            {sectionGroups.map(group => { const items = visibleSections.filter(item => (group.ids as readonly string[]).includes(item.id)); return items.length ? <section className="marketing-ai-nav-group" key={group.en}><h3>{t(group.mn, group.en)}</h3>{items.map((item) => <button key={item.id} type="button" className={item.id === active.id ? "active" : ""} onClick={() => setSection(item.id)}><small>{item.code}</small><span>{t(item.mn, item.en)}</span></button>)}</section> : null; })}
          </nav>
          <footer><i /><span>{t("Бодит илгээлт идэвхгүй", "Live sending disabled")}</span></footer>
        </aside>

        <section className="marketing-ai-content">
          {section === "dashboard" ? <>
            <div className="marketing-ai-section-head"><div><span>01 · CONTROL OVERVIEW</span><h2>{t("Хяналтын самбар", "Dashboard")}</h2></div><em>{t("Суурь хувилбар", "Foundation release")}</em></div>
            <div className="marketing-ai-stats">
              <article><small>{t("Идэвхтэй кампанит ажил", "Active campaigns")}</small><strong>0</strong><span>{t("Суваг холбогдоогүй", "Channels not connected")}</span></article>
              <article><small>{t("Хүлээгдэж буй зөвшөөрөл", "Pending approvals")}</small><strong>{control?.draftCounts?.review || 0}</strong><span>{t("Гадагш үйлдэл хаалттай", "Outbound actions locked")}</span></article>
              <article><small>{t("Холбогдсон суваг", "Connected channels")}</small><strong>1 / 4</strong><span>{t("Зөвхөн iBeX веб суурь", "iBeX website foundation only")}</span></article>
              <article><small>{t("AI сарын төсөв", "Monthly AI budget")}</small><strong>${(control?.usage.estimatedCostUsd || 0).toFixed(4)} / ${controlSettings.monthlyBudgetUsd}</strong><span>{t("App guard · OpenAI hard limit тусдаа", "App guard · separate OpenAI hard limit")}</span></article>
            </div>
            <div className="marketing-ai-dashboard-grid">
              <article className="marketing-ai-pipeline-card">
                <div className="marketing-ai-card-head"><div><span>AGENT WORKFLOW</span><h3>{t("Хяналттай маркетингийн урсгал", "Controlled marketing workflow")}</h3></div><button type="button" onClick={() => setSection("command")}>{t("Командын төв", "Command center")} →</button></div>
                <div className="marketing-ai-pipeline">{workflow.map((step, index) => <div key={step[0]}><small>{step[0]}</small><strong>{t(step[1], step[2])}</strong>{index < workflow.length - 1 ? <b>→</b> : null}</div>)}</div>
              </article>
              <article className="marketing-ai-readiness">
                <div className="marketing-ai-card-head"><div><span>READINESS</span><h3>{t("Холболтын төлөв", "Connection status")}</h3></div></div>
                <ul><li className="ready"><span>{t("Админ permission", "Admin permission")}</span><b>{t("Бэлэн", "Ready")}</b></li><li className="ready"><span>Draft → Review → Decision</span><b>{t("Бэлэн", "Ready")}</b></li><li className={control?.status.keyConfigured ? "ready" : ""}><span>OpenAI API</span><b>{control?.status.keyConfigured ? t("Secret идэвхтэй", "Secret active") : t("Холбогдоогүй", "Not connected")}</b></li><li className={control?.status.tested ? "ready" : ""}><span>{t("Тохиргооны тест", "Configuration test")}</span><b>{control?.status.tested ? t("Амжилттай", "Passed") : t("Шаардлагатай", "Required")}</b></li><li className={control?.status.budgetState === "normal" ? "ready" : ""}><span>{t("Төсвийн төлөв", "Budget state")}</span><b>{control?.status.budgetState || "normal"}</b></li></ul>
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
                <form onSubmit={submitCommand}><textarea value={command} onChange={(event) => setCommand(event.target.value)} maxLength={1200} placeholder={t("Маркетингийн даалгавар бичих…", "Enter a marketing command…")} /><button type="submit" disabled={!command.trim() || running}>{running ? t("Бэлтгэж байна…", "Preparing…") : t("Draft үүсгэх", "Create draft")} ↑</button></form>
              </section>
              <aside className="marketing-ai-command-rules"><span>EXECUTION POLICY</span><h3>{t("Agent-ийн үйлдлийн хязгаар", "Agent action boundary")}</h3><ul><li>{t("Шинжилгээ, төлөвлөгөө, Draft автоматаар бэлтгэж болно", "Analysis, planning and drafts may be prepared automatically")}</li><li>{t("Нийтлэх, илгээх, төсөв зарцуулахад хүн батална", "Publishing, sending and spending require human approval")}</li><li>{t("Нууц үг AI-д өгөхгүй; OAuth эсвэл хязгаарлагдсан token ашиглана", "Never give AI passwords; use OAuth or scoped tokens")}</li><li>{t("Home AI болон tenant өгөгдөлд шууд хандахгүй", "No direct access to Home AI or tenant data")}</li></ul><p>{control?.status.draftReady ? t("OpenAI нь зөвхөн Draft бэлтгэнэ. Prompt-ийн түүхий агуулгыг audit санд хадгалахгүй, гадагш үйлдэл хийхгүй.", "OpenAI prepares drafts only. Raw prompt content is not stored in audit and no external action is performed.") : t("OpenAI key ороогүй үед зөвхөн дотоод ангилалтын fallback ажиллана.", "Until the OpenAI key is configured, only the local classification fallback is available.")}</p></aside>
            </div>
          </> : null}

          {section === "integrations" ? <>
            <div className="marketing-ai-section-head"><div><span>12 · MARKETING CONTROL</span><h2>{t("Интеграц ба тохиргоо", "Integrations & settings")}</h2></div><em>{t("Тусгаарласан OpenAI", "Isolated OpenAI")}</em></div>
            {controlError ? <div className="marketing-ai-control-alert error" role="alert">{controlError}</div> : null}
            {controlMessage ? <div className="marketing-ai-control-alert success" role="status">{controlMessage}</div> : null}
            <form id="marketing-ai-settings-form" className="marketing-ai-control-form" onSubmit={saveControl}>
              <section>
                <div className="marketing-ai-card-head"><div><span>OPENAI PROJECT</span><h3>{t("Marketing AI ажиллагаа", "Marketing AI operation")}</h3></div><b className={control?.status.keyConfigured ? "connected" : "waiting"}>{control?.status.keyConfigured ? t("Холбогдсон", "Connected") : t("Key хүлээж байна", "Waiting for key")}</b></div>
                <div className="marketing-ai-control-fields">
                  <label>{t("Ажиллах горим", "Operating mode")}<select value={controlSettings.mode} onChange={event => setControlSettings(current => ({ ...current, mode: event.target.value as MarketingAiControlSettings["mode"] }))}><option value="disabled">Disabled</option><option value="test">Test</option><option value="production">Production Draft</option></select></label>
                  <label>{t("Хурдан model", "Fast model")}<input value={controlSettings.fastModel} onChange={event => setControlSettings(current => ({ ...current, model: event.target.value, fastModel: event.target.value }))} /></label>
                  <label>{t("Нарийвчилсан model", "Detailed model")}<input value={controlSettings.detailedModel} onChange={event => setControlSettings(current => ({ ...current, detailedModel: event.target.value }))} /></label>
                  <label>{t("Fallback model", "Fallback model")}<input value={controlSettings.fallbackModel} onChange={event => setControlSettings(current => ({ ...current, fallbackModel: event.target.value }))} /></label>
                  <label>{t("Prompt profile", "Prompt profile")}<select value={controlSettings.defaultPromptProfile} onChange={event => setControlSettings(current => ({ ...current, defaultPromptProfile: event.target.value as MarketingAiControlSettings["defaultPromptProfile"] }))}><option value="general">General</option><option value="content">Content</option><option value="campaign">Campaign</option><option value="lead_followup">Lead follow-up</option><option value="report">Report</option></select></label>
                  <label>{t("Reasoning", "Reasoning")}<select value={controlSettings.reasoningEffort} onChange={event => setControlSettings(current => ({ ...current, reasoningEffort: event.target.value as MarketingAiControlSettings["reasoningEffort"] }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                  <label>{t("Max output token", "Max output tokens")}<input type="number" min="120" max="4000" value={controlSettings.maxOutputTokens} onChange={event => setControlSettings(current => ({ ...current, maxOutputTokens: Number(event.target.value) }))} /></label>
                  <label>{t("Өдрийн хүсэлт", "Daily requests")}<input type="number" min="1" max="1000" value={controlSettings.requestsPerDay} onChange={event => setControlSettings(current => ({ ...current, requestsPerDay: Number(event.target.value) }))} /></label>
                </div>
                <div className="marketing-ai-prompt-fields"><label>{t("Брэндийн өнгө аяс", "Brand tone")}<textarea value={controlSettings.brandTone} maxLength={500} onChange={event => setControlSettings(current => ({ ...current, brandTone: event.target.value }))} /></label><label>{t("Баталгаажсан мэдэгдэл", "Approved claims")}<textarea value={controlSettings.approvedClaims} maxLength={4000} onChange={event => setControlSettings(current => ({ ...current, approvedClaims: event.target.value }))} /></label><label>{t("Хориглосон мэдэгдэл", "Prohibited claims")}<textarea value={controlSettings.prohibitedClaims} maxLength={4000} onChange={event => setControlSettings(current => ({ ...current, prohibitedClaims: event.target.value }))} /></label></div>
                <p>{t("OPENAI_MARKETING_API_KEY нь Home AI-ийн key-ээс тусдаа Sites secret байна. Утгыг энэ дэлгэцэнд хэзээ ч харуулахгүй.", "OPENAI_MARKETING_API_KEY is a Sites secret separate from the Home AI key. Its value is never shown on this screen.")}</p>
              </section>
              <section>
                <div className="marketing-ai-card-head"><div><span>CHANNEL VAULT</span><h3>{t("Суваг ба үйлдлийн хамгаалалт", "Channels & action safeguards")}</h3></div></div>
                <ul className="marketing-ai-connection-list">
                  <li className={control?.status.emailConnected ? "ready" : ""}><span>Email OAuth</span><b>{control?.status.emailConnected ? t("Холбогдсон", "Connected") : t("Холбогдоогүй", "Not connected")}</b></li>
                  <li className={control?.status.socialConnected ? "ready" : ""}><span>Social OAuth</span><b>{control?.status.socialConnected ? t("Холбогдсон", "Connected") : t("Холбогдоогүй", "Not connected")}</b></li>
                  <li className="locked"><span>{t("Гадагш илгээх", "Outbound execution")}</span><b>{t("ХААЛТТАЙ", "LOCKED")}</b></li>
                  <li className="ready"><span>{t("Хүний баталгаажуулалт", "Human approval")}</span><b>{t("ЗААВАЛ", "REQUIRED")}</b></li>
                </ul>
                <p>{t("OpenAI холбогдсон ч email/social илгээхгүй. OAuth, хэрэглэгчийн сувгийн зөвшөөрөл, батлагдсан workflow болон delivery audit тусдаа бэлэн болсны дараа дараагийн хувилбараар нээнэ.", "Connecting OpenAI does not enable email or social sending. Outbound remains locked until OAuth, channel consent, an approved workflow and delivery audit are implemented separately.")}</p>
              </section>
              <footer><span>{control?.status.tested ? t(`Сүүлийн амжилттай тест: ${new Date(control.status.testedAt).toLocaleString()}`, `Last successful test: ${new Date(control.status.testedAt).toLocaleString()}`) : t("Хадгалаад бүх model, prompt болон хамгаалалтыг тестлэнэ.", "Save, then test every model, prompt, and safeguard.")}</span><div className="marketing-ai-footer-actions"><button type="button" className="secondary" onClick={testControl} disabled={testingControl || dirty || controlSettings.mode === "disabled"}>{testingControl ? t("Тестэлж байна…", "Testing…") : t("Бүх тохиргоог тестлэх", "Test configuration")}</button><button type="submit" disabled={savingControl || !dirty}>{savingControl ? t("Хадгалж байна…", "Saving…") : t("Тохиргоо хадгалах", "Save settings")}</button></div></footer>
            </form>
          </> : null}

          {section === "approvals" ? <>
            <div className="marketing-ai-section-head"><div><span>08 · HUMAN REVIEW</span><h2>{t("Draft ба зөвшөөрлийн төв", "Draft & approval center")}</h2></div><em>{t("Гадагш үйлдэл хаалттай", "Outbound locked")}</em></div>
            {controlError ? <div className="marketing-ai-control-alert error" role="alert">{controlError}</div> : null}
            {controlMessage ? <div className="marketing-ai-control-alert success" role="status">{controlMessage}</div> : null}
            <div className="marketing-ai-draft-list">
              {drafts.length ? drafts.map(draft => <article key={draft.id}>
                <header><div><span>{draft.status.toUpperCase()} · {draft.promptProfile} · r{draft.revision}</span><h3>{draft.title}</h3></div><small>{draft.model} · {new Date(draft.updatedAt).toLocaleString()}</small></header>
                <p>{draft.content}</p>
                {draft.missingInputs.length ? <ul>{draft.missingInputs.map(item => <li key={item}>{item}</li>)}</ul> : null}
                <footer><small>{draft.promptVersion} · ${Number(draft.estimatedCostUsd || 0).toFixed(6)}</small><div>{canDraft && draft.status === "draft" ? <button type="button" onClick={() => decideDraft(draft, "submit")}>{t("Review-д илгээх", "Submit for review")}</button> : null}{canApprove && draft.status === "review" ? <><button type="button" onClick={() => decideDraft(draft, "approve")}>{t("Батлах", "Approve")}</button><button type="button" className="danger" onClick={() => decideDraft(draft, "reject")}>{t("Татгалзах", "Reject")}</button></> : null}{canApprove && (draft.status === "approved" || draft.status === "rejected") ? <button type="button" className="secondary" onClick={() => decideDraft(draft, "return_to_draft")}>{t("Draft болгох", "Return to draft")}</button> : null}</div></footer>
              </article>) : <section className="marketing-ai-empty-state"><strong>{t("Draft үүсээгүй байна", "No drafts yet")}</strong><p>{t("AI командын төвөөс Draft үүсгэхэд энд хадгалагдаж, Review → Approved/Rejected урсгалаар шийдвэрлэгдэнэ.", "Drafts created in the command center are stored here and move through Review → Approved/Rejected.")}</p></section>}
            </div>
          </> : null}

          {section === "budget" ? <>
            <div className="marketing-ai-section-head"><div><span>09 · COST CONTROL</span><h2>{t("Төсөв ба хэрэглээ", "Budget & usage")}</h2></div><em>{control?.usage.month}</em></div>
            <div className="marketing-ai-stats"><article><small>{t("AI хүсэлт", "AI requests")}</small><strong>{control?.usage.requests || 0}</strong><span>{t("Энэ сарын Draft", "Drafts this month")}</span></article><article><small>{t("Оролтын token", "Input tokens")}</small><strong>{control?.usage.inputTokens || 0}</strong><span>{t("Нийлбэр", "Aggregate")}</span></article><article><small>{t("Гаралтын token", "Output tokens")}</small><strong>{control?.usage.outputTokens || 0}</strong><span>{t("Нийлбэр", "Aggregate")}</span></article><article><small>{t("Тооцоолсон зардал", "Estimated cost")}</small><strong>${(control?.usage.estimatedCostUsd || 0).toFixed(4)}</strong><span>{t("OpenAI Billing эцсийн дүн", "OpenAI Billing is authoritative")}</span></article></div>
            <section className="marketing-ai-budget-settings"><label>{t("Сарын app limit", "Monthly app limit")}<input type="number" min="1" step="0.5" value={controlSettings.monthlyBudgetUsd} onChange={event => setControlSettings(current => ({ ...current, monthlyBudgetUsd: Number(event.target.value) }))} /></label><label>{t("Анхааруулга", "Warning")}<input type="number" min="0.01" step="0.5" value={controlSettings.warningBudgetUsd} onChange={event => setControlSettings(current => ({ ...current, warningBudgetUsd: Number(event.target.value) }))} /></label><label>Critical<input type="number" min="0.01" step="0.5" value={controlSettings.criticalBudgetUsd} onChange={event => setControlSettings(current => ({ ...current, criticalBudgetUsd: Number(event.target.value) }))} /></label><label>{t("Минутын хүсэлт", "Requests per minute")}<input type="number" min="1" max="60" value={controlSettings.requestsPerMinute} onChange={event => setControlSettings(current => ({ ...current, requestsPerMinute: Number(event.target.value) }))} /></label></section>
            <section className="marketing-ai-empty-state"><strong>{t("Хоёр давхар hard stop", "Two-layer hard stop")}</strong><p>{t("Сайтын app guard хүсэлтийг түрүүлж зогсооно. OpenAI Marketing project-ийн hard limit нь эцсийн төлбөрийн хамгаалалт байна. Энд харагдах зардал нь token-д суурилсан дотоод тооцоо юм.", "The site app guard stops requests first. The OpenAI Marketing project hard limit remains the final billing safeguard. Cost shown here is an internal token-based estimate.")}</p></section>
          </> : null}

          {section === "audit" ? <>
            <div className="marketing-ai-section-head"><div><span>13 · GOVERNANCE</span><h2>Audit log</h2></div><em>{t("Prompt агуулгагүй", "No prompt content")}</em></div>
            <div className="marketing-ai-audit-list">{control?.audit.length ? control.audit.map((row, index) => <article key={`${row.createdAt}-${index}`}><span><b>{row.status}</b>{row.eventType}</span><small>{row.model || "local"} · {new Date(row.createdAt).toLocaleString()}</small></article>) : <section className="marketing-ai-empty-state"><strong>{t("Audit event бүртгэгдээгүй", "No audit events")}</strong><p>{t("OpenAI Draft үүсгэсний дараа model, төлөв, token, зардлын metadata энд харагдана. Түүхий prompt хадгалахгүй.", "After an OpenAI draft is created, model, status, token and cost metadata appears here. Raw prompts are not stored.")}</p></section>}</div>
          </> : null}

          {section !== "dashboard" && section !== "command" && section !== "integrations" && section !== "budget" && section !== "approvals" && section !== "audit" ? <>
            <div className="marketing-ai-section-head"><div><span>{active.code} · MARKETING CONTROL</span><h2>{t(active.mn, active.en)}</h2></div><em>{t("Архитектурын суурь", "Architecture foundation")}</em></div>
            <div className="marketing-ai-area-grid">{cards.map((card) => <article key={card.titleEn}><span>{t(card.stateMn, card.stateEn)}</span><h3>{t(card.titleMn, card.titleEn)}</h3><p>{t(card.bodyMn, card.bodyEn)}</p></article>)}</div>
            <section className="marketing-ai-empty-state"><strong>{t("Бодит ажиллагаа одоогоор идэвхгүй", "Live operation is currently disabled")}</strong><p>{t("Энэ хэсгийн бүтэц, эрх болон хамгаалалтын хүрээг бэлтгэсэн. Холбогдох өгөгдлийн эх үүсвэр, API/OAuth эрх, батлагдсан төсөв болон workflow-ийн дараа бодит үйлдлийг үе шаттай идэвхжүүлнэ.", "The structure, permissions and safeguards are prepared. Live actions will be enabled in stages only after data sources, API/OAuth authorization, an approved budget and workflows are configured.")}</p></section>
          </> : null}
        </section>
      </div>
      {dirty ? <aside className="marketing-ai-save-bar"><span>{t("Хадгалаагүй тохиргоо байна. Model эсвэл prompt өөрчлөгдвөл Production тест хүчингүй болно.", "There are unsaved settings. Model or prompt changes invalidate the production test.")}</span><button type="button" onClick={() => void saveControl({ preventDefault() {} } as FormEvent)} disabled={savingControl}>{t("Өөрчлөлт хадгалах", "Save changes")}</button></aside> : null}
    </main>
  );
}
