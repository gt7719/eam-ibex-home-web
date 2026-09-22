import { env } from "cloudflare:workers";
import { safeHttpsUrl } from "./admin-security";

export type KnowledgeStatus = "draft" | "approved" | "archived";
export type KnowledgeVisibility = "public" | "internal" | "restricted";
export type KnowledgeStage = "implemented" | "pilot" | "rnd" | "future" | "general";

export type KnowledgeEntry = {
  id: string;
  topic: string;
  titleMn: string;
  titleEn: string;
  contentMn: string;
  contentEn: string;
  keywords: string[];
  sourceLabel: string;
  sourceUrl: string;
  version: string;
  status: KnowledgeStatus;
  visibility: KnowledgeVisibility;
  stage: KnowledgeStage;
  enabled: boolean;
};

export const defaultKnowledge: KnowledgeEntry[] = [
  {
    id: "kb-asset-core",
    topic: "product",
    titleMn: "Asset Core ба iBeX-ийн үндсэн зарчим",
    titleEn: "Asset Core and the iBeX principle",
    contentMn:
      "iBeX нь хөрөнгөд суурилсан засвар үйлчилгээний удирдлагын систем. Asset Core нь Parent–Child хөрөнгө, байршил, хүсэлт, ажлын захиалга, PM, PdM, үзлэг, нөөц, зардал болон засварын түүхийг хөрөнгө бүрийн хүрээнд уялдуулна.",
    contentEn:
      "iBeX is an asset-based maintenance management system. Asset Core connects Parent–Child assets, locations, requests, work orders, PM, PdM, inspections, inventory, cost and maintenance history around each asset.",
    keywords: ["ibex", "asset", "core", "хөрөнгө", "засвар", "parent", "child", "систем"],
    sourceLabel: "iBeX Website · Approved project knowledge",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "implemented",
    enabled: true,
  },
  {
    id: "kb-workflow",
    topic: "workflow",
    titleMn: "Хүсэлтээс ажлын захиалгын хаалт хүртэл",
    titleEn: "From request to work-order closeout",
    contentMn:
      "Хэрэглэгч хүсэлт гаргасны дараа эрх бүхий ажилтан баталгаажуулж WO Request үүсгэнэ. Төлөвлөгч ажлын хүрээ, баг, материал, checklist болон хугацааг төлөвлөж батлуулна. Гүйцэтгэлийн дараа үргэлжилсэн хугацаа, төлөв, доголдлын шинжилгээг бүртгэн ажлыг хааж, мэдээллийг хөрөнгийн түүхэд хадгална.",
    contentEn:
      "After a user submits a request, an authorized person approves it and a WO Request is created. The planner defines scope, team, materials, checklist and timing. Closeout records duration, status and failure analysis, preserving the result in the asset history.",
    keywords: ["хүсэлт", "request", "work", "order", "wo", "ажлын", "захиалга", "хаалт", "гүйцэтгэл"],
    sourceLabel: "iBeX Website · Approved project knowledge",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "implemented",
    enabled: true,
  },
  {
    id: "kb-pm-pdm",
    topic: "maintenance",
    titleMn: "PM ба PdM",
    titleEn: "PM and PdM",
    contentMn:
      "PM нь Schedule болон Assets нөхцөлд тулгуурлан Direct эсвэл Completed төрлөөр хөрөнгө тус бүрт ажлыг автоматаар үүсгэнэ. Батлагдсан PM-д Start команд өгсний дараа engine ажиллаж, үүссэн WO шууд Approved төлөв авна. PdM нь With Count болон Without Count дүрмээр тоолуур, нөхцөлийн босгоос ажил үүсгэнэ.",
    contentEn:
      "PM creates work per asset from Schedule and Assets using Direct or Completed types. After approval and Start, the engine runs and generated WOs receive Approved status. PdM uses With Count and Without Count rules for meters and condition thresholds.",
    keywords: ["pm", "pdm", "schedule", "direct", "completed", "engine", "урьдчилан", "сэргийлэх", "таамаглах", "тоолуур"],
    sourceLabel: "iBeX Website · Approved project knowledge",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "implemented",
    enabled: true,
  },
  {
    id: "kb-packages",
    topic: "pricing",
    titleMn: "Багц сонгох зарчим",
    titleEn: "Plan selection principle",
    contentMn:
      "Багцын хүрээ нь нийт хэрэглэгчийн тоо, Parent болон Child-ийг хамарсан нийт хөрөнгийн тоо, сонгосон үндсэн ба дэд цэсээр тодорхойлогдоно. Free, Go, Plus, Pro түвшнээс давсан хэрэгцээг Custom гэж тооцно. Эцсийн үнэ болон жилийн хөнгөлөлтийг сайтын админ MNT-ээр удирдана.",
    contentEn:
      "Plan scope is determined by total users, total Parent and Child assets, and selected primary and secondary menus. Requirements beyond Free, Go, Plus and Pro are treated as Custom. Final MNT pricing and annual discount are managed by the site administrator.",
    keywords: ["үнэ", "багц", "pricing", "plan", "free", "go", "plus", "pro", "custom", "хэрэглэгч", "төлбөр"],
    sourceLabel: "iBeX Website · Approved pricing model",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "general",
    enabled: true,
  },
  {
    id: "kb-implementation",
    topic: "implementation",
    titleMn: "iBeX нэвтрүүлэлтийн эхний алхам",
    titleEn: "Starting an iBeX implementation",
    contentMn:
      "iBeX нэвтрүүлэлтийн хугацаа нь байгууллагын хэрэглэгчийн тоо, Parent–Child хөрөнгийн бүртгэл, сонгосон модуль, эх өгөгдлийн бэлэн байдал, сургалт болон шаардлагатай интеграцаас хамаарна. Эхлээд хамрах хүрээг үнэлж, хөрөнгө ба хэрэглэгчийн мэдээллийг бэлтгэн, туршилтын орчинд шалгаад үе шаттай нэвтрүүлнэ. Тодорхой хугацааг байгууллагын анхны үнэлгээний дараа тохирно.",
    contentEn:
      "The time required for iBeX implementation depends on the number of users, Parent–Child asset records, selected modules, source-data readiness, training and required integrations. The process starts with a scope review, prepares asset and user data, validates a pilot environment, then rolls out in stages. A specific timeline is agreed after the initial organizational assessment.",
    keywords: ["нэвтрүүлэлт", "нэвтрүүлэх", "хэрэгжүүлэх", "хугацаа", "implementation", "onboarding", "rollout", "deployment"],
    sourceLabel: "iBeX Website · Approved implementation guidance",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "general",
    enabled: true,
  },
  {
    id: "kb-ai-status",
    topic: "ai",
    titleMn: "iBeX AI хөгжүүлэлтийн төлөв",
    titleEn: "iBeX AI development status",
    contentMn:
      "Одоогийн хэрэгжсэн хүрээнд Datahub интеграц болон дүрэмд суурилсан PdM багтана. Predictive AI, Generative AI болон Agentic AI нь нотолгоо, өгөгдлийн бэлэн байдал, tenant тусгаарлалт, эрхийн хамгаалалт болон инженерийн баталгаажуулалтад тулгуурлан үе шаттай хөгжих чиглэл юм.",
    contentEn:
      "The implemented scope includes Datahub integration and rule-based PdM. Predictive, Generative and Agentic AI are staged development directions governed by evidence, data readiness, tenant isolation, authorization and engineering approval.",
    keywords: ["ai", "хиймэл", "оюун", "predictive", "generative", "agentic", "datahub", "tenant", "roadmap"],
    sourceLabel: "iBeX Website · Approved project knowledge",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "rnd",
    enabled: true,
  },
  {
    id: "kb-home-customer-ai",
    topic: "home-ai",
    titleMn: "iBeX Home AI — хэрэглэгчийн туслах",
    titleEn: "iBeX Home AI — customer assistant",
    contentMn:
      "iBeX Home AI нь веб сайтын хэрэглэгчид зориулсан тусдаа OpenAI-д суурилсан туслах. Баталгаажсан нийтэд нээлттэй мэдээллээс бүтээгдэхүүн, багц, демо, тусламж болон нууцлалын асуултад хариулж, шаардлагатай үед iBeX мэргэжилтэнтэй үргэлжлүүлэх санал гаргана. Энэ нь iBeX Hybrid Intelligent AI болон үйлдвэрлэлийн System AI биш.",
    contentEn:
      "iBeX Home AI is a separate OpenAI-powered assistant for website customers. It can answer general questions, use optional public iBeX references for product-specific context, and propose a handoff to an iBeX specialist. It is not iBeX Hybrid Intelligent AI or the industrial System AI.",
    keywords: ["home", "customer", "хэрэглэгч", "туслах", "openai", "demo", "support", "hybrid", "intelligent"],
    sourceLabel: "iBeX Home AI · Approved service boundary",
    sourceUrl: "",
    version: "R1",
    status: "approved",
    visibility: "public",
    stage: "pilot",
    enabled: true,
  },
  {
    id: "kb-home-marketing-policy",
    topic: "marketing",
    titleMn: "Хэрэглэгчийн мэдээлэл дамжуулах ба маркетингийн зөвшөөрөл",
    titleEn: "Customer handoff and marketing consent",
    contentMn:
      "iBeX Home AI нь зөвхөн хэрэглэгчийн асуултад хариулж, хэрэглэгч өөрөө хүссэн үед бүртгэл эсвэл мэргэжилтэнд шилжүүлэх замыг санал болгоно. Маркетингийн төлөвлөлт, имэйл, сошиал нийтлэл, кампанит ажил болон сувгийн удирдлага нь Home AI-д хамаарахгүй; эдгээр нь тусдаа, зөвхөн админд нээлттэй iBeX Marketing AI модульд байрлана. Хэрэглэгчийн мэдээллийг маркетингийн зорилгоор ашиглахад тухайн сувгийн тусгай зөвшөөрөл шаардлагатай.",
    contentEn:
      "iBeX Home AI only answers customer questions and may offer registration or specialist handoff when the customer asks. Marketing planning, email, social publishing, campaigns and channel operations are outside Home AI and belong to the separate administrator-only iBeX Marketing AI module. Using customer information for marketing requires separate channel consent.",
    keywords: ["маркетинг", "marketing", "campaign", "кампанит", "email", "имэйл", "social", "сошиал", "approval", "баталгаажуулалт"],
    sourceLabel: "iBeX Website · Customer consent boundary",
    sourceUrl: "",
    version: "R1",
    status: "approved",
    visibility: "public",
    stage: "pilot",
    enabled: true,
  },
  {
    id: "kb-website-assistant-boundary",
    topic: "assistant",
    titleMn: "Сайтын AI туслахын хүрээ",
    titleEn: "Website AI assistant boundary",
    contentMn:
      "iBeX Website Assistant нь зөвхөн нийтэд нээлттэй, баталгаажсан сайтын болон Handbook-ийн мэдээллийг тайлбарлана. Энэ туслах нь iBeX System AI-аас бүрэн тусдаа бөгөөд PostgreSQL, Directus, байгууллагын tenant өгөгдөл, хэрэглэгч, хөрөнгө болон бодит WO мэдээлэлд хандахгүй, системд өөрчлөлт хийхгүй.",
    contentEn:
      "The iBeX Website Assistant can use OpenAI general knowledge and optional public website or Handbook references. It is fully separate from iBeX System AI and cannot access PostgreSQL, Directus, tenant data, users, assets or live WO records, and cannot change system data.",
    keywords: ["assistant", "туслах", "chatbot", "чатбот", "system", "website", "аюулгүй", "өгөгдөл", "directus", "postgresql"],
    sourceLabel: "iBeX AI Governance · Website boundary",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "general",
    enabled: true,
  },
];

function isEntry(value: unknown): value is KnowledgeEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<KnowledgeEntry>;
  return Boolean(row.id && row.titleMn && row.contentMn && Array.isArray(row.keywords));
}

export function normalizeKnowledge(value: unknown): KnowledgeEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isEntry).map((row) => ({
    ...row,
    keywords: row.keywords.map(String).filter(Boolean).slice(0, 30),
    sourceUrl: safeHttpsUrl(row.sourceUrl) || "",
    titleEn: row.titleEn || row.titleMn,
    contentEn: row.contentEn || row.contentMn,
    version: row.version || "1.0",
    status: ["draft", "approved", "archived"].includes(row.status) ? row.status : "draft",
    visibility: ["public", "internal", "restricted"].includes(row.visibility)
      ? row.visibility
      : "internal",
    stage: ["implemented", "pilot", "rnd", "future", "general"].includes(row.stage)
      ? row.stage
      : "general",
    enabled: row.enabled !== false,
  })) as KnowledgeEntry[];
}

export async function readKnowledge() {
  const row = await env.DB.prepare(
    "SELECT value_json, updated_at FROM site_content WHERE key = 'assistantKnowledge' LIMIT 1",
  ).first<{ value_json: string; updated_at: string }>();
  if (!row) return { entries: defaultKnowledge, updatedAt: null };
  try {
    const entries = normalizeKnowledge(JSON.parse(row.value_json));
    if (!entries.length) return { entries: defaultKnowledge, updatedAt: row.updated_at };
    const merged = new Map(defaultKnowledge.map((entry) => [entry.id, entry]));
    for (const entry of entries) merged.set(entry.id, entry);
    return { entries: [...merged.values()], updatedAt: row.updated_at };
  } catch {
    return { entries: defaultKnowledge, updatedAt: null };
  }
}
