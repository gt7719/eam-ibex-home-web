import { env } from "cloudflare:workers";

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
    sourceLabel: "Master iBeX Handbook · Asset Core",
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
    sourceLabel: "Master iBeX Handbook · Work Management",
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
    sourceLabel: "Master iBeX Handbook · PM/PdM",
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
    id: "kb-ai-status",
    topic: "ai",
    titleMn: "iBeX AI хөгжүүлэлтийн төлөв",
    titleEn: "iBeX AI development status",
    contentMn:
      "Одоогийн хэрэгжсэн хүрээнд Datahub интеграц болон дүрэмд суурилсан PdM багтана. Predictive AI, Generative AI болон Agentic AI нь нотолгоо, өгөгдлийн бэлэн байдал, tenant тусгаарлалт, эрхийн хамгаалалт болон инженерийн баталгаажуулалтад тулгуурлан үе шаттай хөгжих чиглэл юм.",
    contentEn:
      "The implemented scope includes Datahub integration and rule-based PdM. Predictive, Generative and Agentic AI are staged development directions governed by evidence, data readiness, tenant isolation, authorization and engineering approval.",
    keywords: ["ai", "хиймэл", "оюун", "predictive", "generative", "agentic", "datahub", "tenant", "roadmap"],
    sourceLabel: "Master iBeX Handbook · AI Roadmap",
    sourceUrl: "",
    version: "1.0",
    status: "approved",
    visibility: "public",
    stage: "rnd",
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
      "The iBeX Website Assistant explains only approved public website and Handbook information. It is fully separate from iBeX System AI and cannot access PostgreSQL, Directus, tenant data, users, assets or live WO records, and cannot change system data.",
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
    sourceUrl: row.sourceUrl || "",
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
    return { entries: entries.length ? entries : defaultKnowledge, updatedAt: row.updated_at };
  } catch {
    return { entries: defaultKnowledge, updatedAt: null };
  }
}

