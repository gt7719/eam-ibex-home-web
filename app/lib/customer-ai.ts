import type { KnowledgeEntry } from "./assistant-knowledge";

export type CustomerAiLang = "mn" | "en";
export type CustomerAiIntent =
  | "general"
  | "product"
  | "pricing"
  | "demo"
  | "support"
  | "privacy";

export type CustomerAiHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type CustomerAiPayload = {
  message: string;
  lang: CustomerAiLang;
  sessionId: string;
  consent: true;
  history: CustomerAiHistoryItem[];
};

export type CustomerAiSource = {
  id: string;
  title: string;
  label: string;
  url: string;
  version: string;
  stage: string;
  excerpt: string;
};

export type CustomerAiRuntimeEnv = {
  OPENAI_HOME_API_KEY?: string;
  CUSTOMER_AI_FAST_MODEL?: string;
  CUSTOMER_AI_COMPLEX_MODEL?: string;
  CUSTOMER_AI_MONTHLY_BUDGET_USD?: string;
  CUSTOMER_AI_MIN_FAIR_SHARE_USD?: string;
  CUSTOMER_AI_REQUESTS_PER_MINUTE?: string;
  CUSTOMER_AI_REQUESTS_PER_DAY?: string;
  CUSTOMER_AI_MAX_OUTPUT_TOKENS?: string;
  CUSTOMER_AI_FAST_INPUT_USD_PER_MTOK?: string;
  CUSTOMER_AI_FAST_OUTPUT_USD_PER_MTOK?: string;
  CUSTOMER_AI_COMPLEX_INPUT_USD_PER_MTOK?: string;
  CUSTOMER_AI_COMPLEX_OUTPUT_USD_PER_MTOK?: string;
  HOME_AI_ID_HASH_SALT?: string;
};

export type CustomerAiPreparedStatement = {
  bind(...values: unknown[]): CustomerAiPreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

export type CustomerAiDatabase = {
  prepare(query: string): CustomerAiPreparedStatement;
  batch(statements: CustomerAiPreparedStatement[]): Promise<unknown[]>;
};

export type CustomerAiConfig = {
  fastModel: string;
  complexModel: string;
  monthlyBudgetUsd: number;
  minimumFairShareUsd: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  maxOutputTokens: number;
  fastInputUsdPerMtok: number;
  fastOutputUsdPerMtok: number;
  complexInputUsdPerMtok: number;
  complexOutputUsdPerMtok: number;
  identitySalt: string;
};

export const CUSTOMER_AI_CHANNEL = "ibex-home";
export const CUSTOMER_AI_POLICY_VERSION = "2026-09-r1";
export const CUSTOMER_AI_DATA_BOUNDARY = "approved-public-website-only";
const allowedPayloadKeys = new Set(["message", "lang", "sessionId", "consent", "history"]);
const stopWords = new Set([
  "нь", "ба", "бөгөөд", "энэ", "тэр", "юу", "ямар", "яаж", "хэрхэн", "тухай",
  "the", "and", "is", "are", "what", "how", "about", "with", "for",
]);

const greetingPatterns = [
  /^(?:hi|hello|hey)$/i,
  /^(?:сайн уу|сайн байна уу|сайн байцгаана уу|өглөөний мэнд|өдрийн мэнд|оройн мэнд)$/iu,
];

function boundedNumber(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export function customerAiConfig(runtime: CustomerAiRuntimeEnv, overrides?: Partial<{
  fastModel: string;
  complexModel: string;
  monthlyBudgetUsd: number;
  minimumFairShareUsd: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  maxOutputTokens: number;
}>): CustomerAiConfig {
  return {
    fastModel: overrides?.fastModel || runtime.CUSTOMER_AI_FAST_MODEL?.trim() || "gpt-5.6-luna",
    complexModel: overrides?.complexModel || runtime.CUSTOMER_AI_COMPLEX_MODEL?.trim() || "gpt-5.6-terra",
    monthlyBudgetUsd: boundedNumber(String(overrides?.monthlyBudgetUsd ?? runtime.CUSTOMER_AI_MONTHLY_BUDGET_USD ?? ""), 10, 1, 1_000_000),
    minimumFairShareUsd: boundedNumber(String(overrides?.minimumFairShareUsd ?? runtime.CUSTOMER_AI_MIN_FAIR_SHARE_USD ?? ""), 0.25, 0.01, 1_000),
    requestsPerMinute: Math.round(boundedNumber(String(overrides?.requestsPerMinute ?? runtime.CUSTOMER_AI_REQUESTS_PER_MINUTE ?? ""), 6, 1, 120)),
    requestsPerDay: Math.round(boundedNumber(String(overrides?.requestsPerDay ?? runtime.CUSTOMER_AI_REQUESTS_PER_DAY ?? ""), 10, 1, 10_000)),
    maxOutputTokens: Math.round(boundedNumber(String(overrides?.maxOutputTokens ?? runtime.CUSTOMER_AI_MAX_OUTPUT_TOKENS ?? ""), 520, 120, 2_000)),
    // Rates are estimates used by the application guard. The OpenAI project spend
    // limit remains the authoritative hard stop and these values must be reviewed
    // whenever the configured models or OpenAI pricing change.
    fastInputUsdPerMtok: boundedNumber(runtime.CUSTOMER_AI_FAST_INPUT_USD_PER_MTOK, 0.2, 0, 1_000),
    fastOutputUsdPerMtok: boundedNumber(runtime.CUSTOMER_AI_FAST_OUTPUT_USD_PER_MTOK, 1.2, 0, 1_000),
    complexInputUsdPerMtok: boundedNumber(runtime.CUSTOMER_AI_COMPLEX_INPUT_USD_PER_MTOK, 2, 0, 1_000),
    complexOutputUsdPerMtok: boundedNumber(runtime.CUSTOMER_AI_COMPLEX_OUTPUT_USD_PER_MTOK, 12, 0, 1_000),
    identitySalt: runtime.HOME_AI_ID_HASH_SALT?.trim() || "ibex-home-customer-ai-v1",
  };
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, maxLength) : "";
}

export function parseCustomerAiPayload(value: unknown):
  | { ok: true; payload: CustomerAiPayload }
  | { ok: false; code: "INVALID_REQUEST" | "CONSENT_REQUIRED"; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Invalid request" };
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowedPayloadKeys.has(key))) {
    return { ok: false, code: "INVALID_REQUEST", message: "Unsupported field" };
  }
  if (input.consent !== true) {
    return { ok: false, code: "CONSENT_REQUIRED", message: "AI service consent is required" };
  }
  const message = cleanText(input.message, 1_200);
  const sessionId = cleanText(input.sessionId, 96);
  if (message.length < 2 || !/^[a-zA-Z0-9._:-]{16,96}$/.test(sessionId)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Invalid message or session" };
  }
  if (input.history !== undefined && !Array.isArray(input.history)) {
    return { ok: false, code: "INVALID_REQUEST", message: "Invalid history" };
  }
  const history: CustomerAiHistoryItem[] = [];
  for (const item of (input.history as unknown[] | undefined)?.slice(-6) || []) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some((key) => key !== "role" && key !== "content")) continue;
    if (row.role !== "user" && row.role !== "assistant") continue;
    const content = cleanText(row.content, 800);
    if (content) history.push({ role: row.role, content });
  }
  return {
    ok: true,
    payload: { message, lang: input.lang === "en" ? "en" : "mn", sessionId, consent: true, history },
  };
}

function textTokens(value: string) {
  return [...new Set(
    value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/)
      .filter((token) => token.length > 1 && !stopWords.has(token)),
  )];
}

export function isCustomerAiGreeting(message: string) {
  const normalized = message.trim().replace(/[!?.…,]+/gu, "").replace(/\s+/gu, " ");
  return greetingPatterns.some((pattern) => pattern.test(normalized));
}

export function customerAiGreetingAnswer(lang: CustomerAiLang) {
  return lang === "en"
    ? "Hello! I’m Home AI. I can help with iBeX products, plans, registration, sign-in, and general website information."
    : "Сайн байна уу! Би Home AI. iBeX-ийн бүтээгдэхүүн, багц, бүртгэл, нэвтрэлт болон вэбийн ерөнхий мэдээллээр тусалж чадна.";
}

export function customerAiContextualQuery(message: string, history: CustomerAiHistoryItem[]) {
  const current = message.trim();
  const isFollowUp = current.length <= 100 && /(?:хэр их|хэдий|хэдэн|хугацаа|энэ нь|тэгвэл|тийм бол|дэлгэрүүл|ямар үнэтэй|how long|how much|what about|tell me more)/iu.test(current);
  if (!isFollowUp) return current;
  const previousQuestion = [...history].reverse().find((item) => item.role === "user")?.content.trim();
  return previousQuestion ? `${previousQuestion}\n${current}` : current;
}

export function customerAiImplementationAnswer(lang: CustomerAiLang, message: string, history: CustomerAiHistoryItem[] = []) {
  const contextualQuery = customerAiContextualQuery(message, history);
  if (!/(нэвтрүүл|хэрэгжүүл|implementation|onboard|rollout|deploy)/i.test(contextualQuery)) return "";
  const asksDuration = /(?:хэр их|хэдий|хэдэн|хугацаа|how long|timeline|duration)/iu.test(message);
  if (asksDuration) return lang === "en"
    ? "The implementation timeline is agreed after reviewing your user and asset counts, selected modules, source-data readiness, training needs, and integrations. iBeX does not promise a fixed duration before that scope review; a pilot is validated first, then the rollout schedule is confirmed with your organization."
    : "Нэвтрүүлэх хугацааг танай хэрэглэгч, хөрөнгийн тоо, сонгосон модуль, эх өгөгдлийн бэлэн байдал, сургалт болон интеграцын хэрэгцээг үнэлсний дараа тохирно. Энэ үнэлгээгүйгээр тогтсон хоног амлахгүй; эхлээд туршилтын орчноо баталгаажуулж, дараа нь байгууллагатай хамт нэвтрүүлэх хуваарийг тогтооно.";
  return lang === "en"
    ? "iBeX implementation is staged. The timeline depends on user and asset volume, selected modules, source-data readiness, training and any required integrations. We first review the scope, prepare data, validate a pilot, then agree the rollout timeline with the organization."
    : "iBeX нэвтрүүлэлтийг үе шаттай хийдэг. Хугацаа нь хэрэглэгч ба хөрөнгийн тоо, сонгосон модуль, эх өгөгдлийн бэлэн байдал, сургалт болон шаардлагатай интеграцаас хамаарна. Эхлээд хамрах хүрээг үнэлж, өгөгдлөө бэлтгэн туршилтаар шалгаад байгууллагатай хамт нэвтрүүлэх хугацааг тохирно.";
}

function safePublicSourceUrl(value: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function retrieveCustomerAiKnowledge(entries: KnowledgeEntry[], query: string, lang: CustomerAiLang) {
  const queryTokens = textTokens(query);
  return entries
    .filter((entry) => entry.enabled && entry.status === "approved" && entry.visibility === "public")
    .map((entry) => {
      const content = lang === "en" ? entry.contentEn : entry.contentMn;
      const haystack = textTokens(`${entry.titleMn} ${entry.titleEn} ${content} ${entry.keywords.join(" ")} ${entry.topic}`);
      const keywordSet = new Set(entry.keywords.flatMap(textTokens));
      const score = queryTokens.reduce((total, word) => {
        if (keywordSet.has(word)) return total + 5;
        if (haystack.includes(word)) return total + 2;
        if (word.length < 3) return total;
        return total + (haystack.some((candidate) => candidate.startsWith(word) || word.startsWith(candidate)) ? 1 : 0);
      }, 0);
      return { entry, content, score };
    })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ entry, content }) => ({
      id: entry.id,
      title: lang === "en" ? entry.titleEn : entry.titleMn,
      label: entry.sourceLabel,
      url: safePublicSourceUrl(entry.sourceUrl),
      version: entry.version,
      stage: entry.stage,
      excerpt: content.slice(0, 1_100),
    } satisfies CustomerAiSource));
}

export function customerAiGuard(message: string): "secret" | "prompt_injection" | null {
  const normalized = message.toLocaleLowerCase();
  if (/\bsk-[a-z0-9_-]{12,}\b/i.test(message) || /(?:password|нууц үг|api[_ -]?key)\s*[:=]\s*\S{6,}/i.test(message)) {
    return "secret";
  }
  if (/(ignore|disregard).{0,30}(previous|system|developer).{0,30}(instruction|prompt)|(?:өмнөх|системийн).{0,30}(заавар|prompt).{0,30}(үл тоо|март)/i.test(normalized)) {
    return "prompt_injection";
  }
  return null;
}

export function inferCustomerAiIntent(message: string): CustomerAiIntent {
  const value = message.toLocaleLowerCase();
  if (/(privacy|нууцлал|өгөгдөл|data|consent|зөвшөөрөл)/i.test(value)) return "privacy";
  if (/(demo|демо|уулзалт|meeting|турш|contact|холбогд)/i.test(value)) return "demo";
  if (/(price|pricing|үнэ|төлбөр|багц|plan|quote|үнийн санал)/i.test(value)) return "pricing";
  if (/(marketing|маркетинг|campaign|кампанит|social|сошиал|email|имэйл)/i.test(value)) return "privacy";
  if (/(support|тусламж|алдаа|ажиллахгүй|problem|issue)/i.test(value)) return "support";
  if (/(asset|хөрөнгө|maintenance|засвар|workflow|pm|pdm|module|модуль|ibex)/i.test(value)) return "product";
  return "general";
}

export function customerAiHandoff(message: string, intent: CustomerAiIntent) {
  const directRequest = /(demo|демо|уулзалт|meeting|contact|холбогд|quote|үнийн санал|purchase|buy|худалдан)/i.test(message);
  const required = directRequest || intent === "support";
  return {
    required,
    reason: required ? intent : "none",
    href: "/register",
  };
}

export function selectCustomerAiModel(config: CustomerAiConfig, message: string, history: CustomerAiHistoryItem[]) {
  const complex = message.length > 520 || history.length >= 4 || /(compare|architecture|integration|security|харьцуул|архитектур|интеграц|аюулгүй байдал)/i.test(message);
  return complex ? config.complexModel : config.fastModel;
}

export async function hashCustomerAiSubject(value: string, salt: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}|${value}`));
  return Array.from(new Uint8Array(bytes), (part) => part.toString(16).padStart(2, "0")).join("");
}

export function estimateCustomerAiCost(
  config: CustomerAiConfig,
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const complex = model === config.complexModel;
  const inputRate = complex ? config.complexInputUsdPerMtok : config.fastInputUsdPerMtok;
  const outputRate = complex ? config.complexOutputUsdPerMtok : config.fastOutputUsdPerMtok;
  return Number(((inputTokens * inputRate + outputTokens * outputRate) / 1_000_000).toFixed(6));
}

export class CustomerAiQuotaError extends Error {
  constructor(
    public readonly reason: "minute" | "day" | "fair_share" | "monthly_budget",
    public readonly retryAfterSeconds: number,
  ) {
    super(reason);
  }
}

export type CustomerAiBudgetState = {
  month: string;
  monthlyBudgetUsd: number;
  estimatedPoolSpentUsd: number;
  estimatedSubjectSpentUsd: number;
  fairShareUsd: number;
  activeSubjects: number;
};

export async function enforceCustomerAiQuota(
  db: CustomerAiDatabase,
  subjectHash: string,
  config: CustomerAiConfig,
  estimatedReservationUsd: number,
  now = new Date(),
): Promise<CustomerAiBudgetState> {
  const minuteKey = now.toISOString().slice(0, 16);
  const dayKey = now.toISOString().slice(0, 10);
  const monthKey = dayKey.slice(0, 7);
  const secondsToNextMinute = Math.max(1, 60 - now.getUTCSeconds());
  const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const secondsToNextDay = Math.max(1, Math.ceil((nextDay - now.getTime()) / 1_000));
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const secondsToNextMonth = Math.max(1, Math.ceil((nextMonth - now.getTime()) / 1_000));
  const staleWindowCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1_000).toISOString();
  await db.batch([
    db.prepare(
      "INSERT INTO customer_ai_rate_limits (subject_hash, scope, window_key, request_count, updated_at) VALUES (?, 'minute', ?, 1, ?) ON CONFLICT(subject_hash, scope, window_key) DO UPDATE SET request_count=request_count+1, updated_at=excluded.updated_at",
    ).bind(subjectHash, minuteKey, now.toISOString()),
    db.prepare(
      "INSERT INTO customer_ai_rate_limits (subject_hash, scope, window_key, request_count, updated_at) VALUES (?, 'day', ?, 1, ?) ON CONFLICT(subject_hash, scope, window_key) DO UPDATE SET request_count=request_count+1, updated_at=excluded.updated_at",
    ).bind(subjectHash, dayKey, now.toISOString()),
    db.prepare("DELETE FROM customer_ai_rate_limits WHERE updated_at < ?").bind(staleWindowCutoff),
  ]);
  const [minute, day, pool, subject] = await Promise.all([
    db.prepare("SELECT request_count FROM customer_ai_rate_limits WHERE subject_hash=? AND scope='minute' AND window_key=? LIMIT 1")
      .bind(subjectHash, minuteKey).first<{ request_count: number }>(),
    db.prepare("SELECT request_count FROM customer_ai_rate_limits WHERE subject_hash=? AND scope='day' AND window_key=? LIMIT 1")
      .bind(subjectHash, dayKey).first<{ request_count: number }>(),
    db.prepare("SELECT COALESCE(SUM(estimated_cost_usd),0) AS spent, COUNT(*) AS active FROM customer_ai_monthly_usage WHERE month_key=?")
      .bind(monthKey).first<{ spent: number; active: number }>(),
    db.prepare("SELECT estimated_cost_usd FROM customer_ai_monthly_usage WHERE subject_hash=? AND month_key=? LIMIT 1")
      .bind(subjectHash, monthKey).first<{ estimated_cost_usd: number }>(),
  ]);
  if (Number(minute?.request_count || 0) > config.requestsPerMinute) throw new CustomerAiQuotaError("minute", secondsToNextMinute);
  if (Number(day?.request_count || 0) > config.requestsPerDay) throw new CustomerAiQuotaError("day", secondsToNextDay);
  const poolSpent = Number(pool?.spent || 0);
  const subjectSpent = Number(subject?.estimated_cost_usd || 0);
  const activeSubjects = Math.max(1, Number(pool?.active || 0) + (subject ? 0 : 1));
  const baseShare = config.monthlyBudgetUsd / activeSubjects;
  const fairShareUsd = Math.min(config.monthlyBudgetUsd, Math.max(config.minimumFairShareUsd, baseShare * 2));
  if (poolSpent + estimatedReservationUsd > config.monthlyBudgetUsd) throw new CustomerAiQuotaError("monthly_budget", secondsToNextMonth);
  if (subjectSpent + estimatedReservationUsd > fairShareUsd) throw new CustomerAiQuotaError("fair_share", secondsToNextMonth);
  return {
    month: monthKey,
    monthlyBudgetUsd: config.monthlyBudgetUsd,
    estimatedPoolSpentUsd: poolSpent,
    estimatedSubjectSpentUsd: subjectSpent,
    fairShareUsd,
    activeSubjects,
  };
}

export async function recordCustomerAiConsent(db: CustomerAiDatabase, subjectHash: string, now = new Date()) {
  await db.prepare(
    "INSERT INTO customer_ai_consents (subject_hash, consent_type, policy_version, status, source, updated_at) VALUES (?, 'ai_service', ?, 'accepted', 'home_widget', ?) ON CONFLICT(subject_hash, consent_type) DO UPDATE SET policy_version=excluded.policy_version, status=excluded.status, source=excluded.source, updated_at=excluded.updated_at",
  ).bind(subjectHash, CUSTOMER_AI_POLICY_VERSION, now.toISOString()).run();
}

export async function recordCustomerAiOutcome(input: {
  db: CustomerAiDatabase;
  requestId: string;
  subjectHash: string;
  eventType: string;
  status: string;
  model: string | null;
  intent: CustomerAiIntent;
  sourceIds: string[];
  messageLength: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  metadata?: Record<string, unknown>;
  now?: Date;
}) {
  const now = input.now || new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const metadata = {
    requestId: input.requestId,
    channel: CUSTOMER_AI_CHANNEL,
    dataBoundary: CUSTOMER_AI_DATA_BOUNDARY,
    intent: input.intent,
    sourceIds: input.sourceIds,
    messageLength: input.messageLength,
    ...input.metadata,
  };
  await input.db.batch([
    input.db.prepare(
      "INSERT INTO customer_ai_audit_events (id, subject_hash, channel, event_type, model, status, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), input.subjectHash, CUSTOMER_AI_CHANNEL, input.eventType, input.model, input.status, JSON.stringify(metadata), now.toISOString()),
    input.db.prepare(
      "INSERT INTO customer_ai_monthly_usage (subject_hash, month_key, request_count, input_tokens, output_tokens, estimated_cost_usd, updated_at) VALUES (?, ?, 1, ?, ?, ?, ?) ON CONFLICT(subject_hash, month_key) DO UPDATE SET request_count=request_count+1, input_tokens=input_tokens+excluded.input_tokens, output_tokens=output_tokens+excluded.output_tokens, estimated_cost_usd=estimated_cost_usd+excluded.estimated_cost_usd, updated_at=excluded.updated_at",
    ).bind(input.subjectHash, monthKey, input.inputTokens, input.outputTokens, input.estimatedCostUsd, now.toISOString()),
  ]);
}

export function safeCustomerAiAnswer(lang: CustomerAiLang, guard: ReturnType<typeof customerAiGuard>) {
  if (guard === "secret") {
    return lang === "en"
      ? "Please do not share passwords, API keys or other secrets in chat. Remove the secret and ask again; iBeX Home AI never needs your administrator password."
      : "Нууц үг, API key болон бусад нууц мэдээллийг чатад бүү оруулна уу. Нууц утгыг арилгаад дахин асуугаарай — iBeX Home AI-д таны админ нууц үг хэрэггүй.";
  }
  return lang === "en"
    ? "I cannot replace or reveal my operating instructions. I can still help with approved public iBeX product, plan, demo and support information."
    : "Би өөрийн ажиллагааны зааврыг солих эсвэл задруулахгүй. Харин iBeX-ийн баталгаажсан бүтээгдэхүүн, багц, демо болон тусламжийн мэдээллээр тусалж чадна.";
}

export function noKnowledgeAnswer(lang: CustomerAiLang) {
  return lang === "en"
    ? "I could not verify that answer in approved public iBeX materials. I will not guess. Ask about the product, plans, demo, support, privacy or the Home AI service."
    : "Энэ хариултыг iBeX-ийн баталгаажсан нийтэд нээлттэй материалаас нотолж чадсангүй. Би таамаглахгүй. Бүтээгдэхүүн, багц, демо, тусламж, нууцлал эсвэл Home AI үйлчилгээний талаар асуугаарай.";
}
