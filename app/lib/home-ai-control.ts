import type { CustomerAiDatabase } from "./customer-ai";

export type HomeAiMode = "disabled" | "test" | "production";

export type HomeAiControlSettings = {
  mode: HomeAiMode;
  fastModel: string;
  complexModel: string;
  monthlyBudgetUsd: number;
  warningBudgetUsd: number;
  criticalBudgetUsd: number;
  minimumFairShareUsd: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  maxOutputTokens: number;
  publishedPromptId: string;
  historyRetentionDays: number;
};

export const HOME_AI_SETTINGS_KEY = "homeAiControl";

export const DEFAULT_HOME_AI_SETTINGS: HomeAiControlSettings = {
  mode: "test",
  fastModel: "gpt-5.6-luna",
  complexModel: "gpt-5.6-terra",
  monthlyBudgetUsd: 10,
  warningBudgetUsd: 5,
  criticalBudgetUsd: 8,
  minimumFairShareUsd: 0.25,
  requestsPerMinute: 6,
  requestsPerDay: 10,
  maxOutputTokens: 520,
  publishedPromptId: "",
  historyRetentionDays: 90,
};

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function safeModel(value: unknown, fallback: string) {
  const model = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9._:-]{2,80}$/.test(model) ? model : fallback;
}

function safePromptId(value: unknown) {
  const promptId = typeof value === "string" ? value.trim() : "";
  return !promptId || /^pmpt_[a-zA-Z0-9_-]{6,200}$/.test(promptId) ? promptId : "";
}

export function normalizeHomeAiSettings(value: unknown): HomeAiControlSettings {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const mode: HomeAiMode = row.mode === "disabled" || row.mode === "production" || row.mode === "test" ? row.mode : DEFAULT_HOME_AI_SETTINGS.mode;
  const monthlyBudgetUsd = boundedNumber(row.monthlyBudgetUsd, DEFAULT_HOME_AI_SETTINGS.monthlyBudgetUsd, 1, 1_000_000);
  const warningBudgetUsd = boundedNumber(row.warningBudgetUsd, DEFAULT_HOME_AI_SETTINGS.warningBudgetUsd, 0.01, monthlyBudgetUsd);
  const criticalBudgetUsd = boundedNumber(row.criticalBudgetUsd, DEFAULT_HOME_AI_SETTINGS.criticalBudgetUsd, warningBudgetUsd, monthlyBudgetUsd);
  return {
    mode,
    fastModel: safeModel(row.fastModel, DEFAULT_HOME_AI_SETTINGS.fastModel),
    complexModel: safeModel(row.complexModel, DEFAULT_HOME_AI_SETTINGS.complexModel),
    monthlyBudgetUsd,
    warningBudgetUsd,
    criticalBudgetUsd,
    minimumFairShareUsd: boundedNumber(row.minimumFairShareUsd, DEFAULT_HOME_AI_SETTINGS.minimumFairShareUsd, 0.01, monthlyBudgetUsd),
    requestsPerMinute: Math.round(boundedNumber(row.requestsPerMinute, DEFAULT_HOME_AI_SETTINGS.requestsPerMinute, 1, 120)),
    requestsPerDay: Math.round(boundedNumber(row.requestsPerDay, DEFAULT_HOME_AI_SETTINGS.requestsPerDay, 1, 10_000)),
    maxOutputTokens: Math.round(boundedNumber(row.maxOutputTokens, DEFAULT_HOME_AI_SETTINGS.maxOutputTokens, 120, 2_000)),
    publishedPromptId: safePromptId(row.publishedPromptId),
    historyRetentionDays: Math.round(boundedNumber(row.historyRetentionDays, DEFAULT_HOME_AI_SETTINGS.historyRetentionDays, 1, 365)),
  };
}

export async function readHomeAiSettings(db: CustomerAiDatabase) {
  const row = await db.prepare("SELECT value_json, updated_at, updated_by FROM site_content WHERE key = ? LIMIT 1")
    .bind(HOME_AI_SETTINGS_KEY)
    .first<{ value_json: string; updated_at: string; updated_by: string | null }>();
  if (!row) return { settings: DEFAULT_HOME_AI_SETTINGS, revision: null as string | null, updatedAt: null as string | null, updatedBy: null as string | null };
  try {
    return { settings: normalizeHomeAiSettings(JSON.parse(row.value_json)), revision: row.updated_at, updatedAt: row.updated_at, updatedBy: row.updated_by };
  } catch {
    return { settings: DEFAULT_HOME_AI_SETTINGS, revision: row.updated_at, updatedAt: row.updated_at, updatedBy: row.updated_by };
  }
}
