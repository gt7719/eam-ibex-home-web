export const MARKETING_AI_DOMAINS = ["knowledge", "leads", "content", "campaigns", "channels", "automation"] as const;
export type MarketingAiDomain = (typeof MARKETING_AI_DOMAINS)[number];

export type MarketingAiRecord = {
  id: string;
  domain: MarketingAiDomain;
  kind: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
  revision: number;
  ownerId: string;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const DOMAIN_KINDS: Record<MarketingAiDomain, readonly string[]> = {
  knowledge: ["source", "claim", "template"],
  leads: ["lead"],
  content: ["post", "email", "video", "website", "event"],
  campaigns: ["campaign"],
  channels: ["email", "facebook", "website", "other"],
  automation: ["rule"],
};

export function isMarketingAiDomain(value: unknown): value is MarketingAiDomain {
  return typeof value === "string" && (MARKETING_AI_DOMAINS as readonly string[]).includes(value);
}

export function normalizeMarketingAiKind(domain: MarketingAiDomain, value: unknown) {
  const kind = typeof value === "string" ? value.trim().toLowerCase() : "";
  return DOMAIN_KINDS[domain].includes(kind) ? kind : DOMAIN_KINDS[domain][0];
}

function safeScalar(value: unknown): string | number | boolean | null {
  if (typeof value === "boolean" || value === null) return value;
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(-1_000_000_000, Math.min(1_000_000_000, value)) : 0;
  return typeof value === "string" ? value.trim().slice(0, 8_000) : "";
}

function looksSecret(key: string, value: unknown) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (/(password|secret|apikey|accesstoken|refreshtoken|privatekey|credential)/.test(normalized)) return true;
  return typeof value === "string" && /(^|\s)(sk-[a-z0-9_-]{12,}|bearer\s+[a-z0-9._-]{12,})/i.test(value);
}

export function normalizeMarketingAiData(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result: Record<string, string | number | boolean | null | Array<string | number | boolean | null>> = {};
  for (const [rawKey, rawValue] of Object.entries(source).slice(0, 40)) {
    const key = rawKey.trim().replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80);
    if (!key || looksSecret(key, rawValue)) continue;
    result[key] = Array.isArray(rawValue) ? rawValue.slice(0, 40).map(safeScalar) : safeScalar(rawValue);
  }
  return result;
}

export function validateMarketingAiRecord(domain: MarketingAiDomain, title: unknown, data: unknown) {
  const safeTitle = typeof title === "string" ? title.trim().slice(0, 180) : "";
  if (safeTitle.length < 2) return { error: "Нэрийг 2-оос дээш тэмдэгтээр оруулна уу.", title: safeTitle, data: {} };
  const safeData = normalizeMarketingAiData(data);
  if (domain === "leads" && !String(safeData.organization || safeData.source || "").trim()) {
    return { error: "Lead-д байгууллага эсвэл эх үүсвэрийн аль нэгийг оруулна уу.", title: safeTitle, data: safeData };
  }
  if (domain === "knowledge" && !String(safeData.body || "").trim()) {
    return { error: "Мэдлэг эсвэл загварын агуулга хоосон байна.", title: safeTitle, data: safeData };
  }
  return { error: "", title: safeTitle, data: safeData };
}

export function marketingAiRecordSnapshot(record: Omit<MarketingAiRecord, "data"> & { data?: Record<string, unknown>; data_json?: string }) {
  let data = record.data || {};
  if (record.data_json) { try { data = JSON.parse(record.data_json); } catch { data = {}; } }
  return { id: record.id, domain: record.domain, kind: record.kind, title: record.title, status: record.status, data,
    revision: Number(record.revision), ownerId: record.ownerId, approvedBy: record.approvedBy, approvedAt: record.approvedAt,
    publishedAt: record.publishedAt, archivedAt: record.archivedAt, createdAt: record.createdAt, updatedAt: record.updatedAt };
}

export const MARKETING_AI_OUTBOUND_LOCKED = true as const;
