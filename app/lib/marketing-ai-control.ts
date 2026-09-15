export type MarketingAiMode = "disabled" | "test" | "production";

export type MarketingAiControlSettings = {
  mode: MarketingAiMode;
  model: string;
  monthlyBudgetUsd: number;
  warningBudgetUsd: number;
  criticalBudgetUsd: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  maxOutputTokens: number;
  humanApprovalRequired: true;
  outboundEnabled: false;
};

export const MARKETING_AI_SETTINGS_KEY = "marketingAiControl";

export const DEFAULT_MARKETING_AI_SETTINGS: MarketingAiControlSettings = {
  mode: "disabled",
  model: "gpt-5.6-luna",
  monthlyBudgetUsd: 10,
  warningBudgetUsd: 5,
  criticalBudgetUsd: 8,
  requestsPerMinute: 4,
  requestsPerDay: 30,
  maxOutputTokens: 700,
  humanApprovalRequired: true,
  outboundEnabled: false,
};

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export function normalizeMarketingAiSettings(value: unknown): MarketingAiControlSettings {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const mode: MarketingAiMode = row.mode === "disabled" || row.mode === "test" || row.mode === "production" ? row.mode : DEFAULT_MARKETING_AI_SETTINGS.mode;
  const monthlyBudgetUsd = boundedNumber(row.monthlyBudgetUsd, DEFAULT_MARKETING_AI_SETTINGS.monthlyBudgetUsd, 1, 1_000_000);
  const warningBudgetUsd = boundedNumber(row.warningBudgetUsd, DEFAULT_MARKETING_AI_SETTINGS.warningBudgetUsd, 0.01, monthlyBudgetUsd);
  const criticalBudgetUsd = boundedNumber(row.criticalBudgetUsd, DEFAULT_MARKETING_AI_SETTINGS.criticalBudgetUsd, warningBudgetUsd, monthlyBudgetUsd);
  const model = typeof row.model === "string" && /^[a-zA-Z0-9._:-]{2,80}$/.test(row.model.trim()) ? row.model.trim() : DEFAULT_MARKETING_AI_SETTINGS.model;
  return {
    mode,
    model,
    monthlyBudgetUsd,
    warningBudgetUsd,
    criticalBudgetUsd,
    requestsPerMinute: Math.round(boundedNumber(row.requestsPerMinute, DEFAULT_MARKETING_AI_SETTINGS.requestsPerMinute, 1, 60)),
    requestsPerDay: Math.round(boundedNumber(row.requestsPerDay, DEFAULT_MARKETING_AI_SETTINGS.requestsPerDay, 1, 1_000)),
    maxOutputTokens: Math.round(boundedNumber(row.maxOutputTokens, DEFAULT_MARKETING_AI_SETTINGS.maxOutputTokens, 120, 2_000)),
    humanApprovalRequired: true,
    outboundEnabled: false,
  };
}

export async function readMarketingAiSettings(db: MarketingAiDatabase) {
  const row = await db.prepare("SELECT value_json, updated_at FROM site_content WHERE key = ? LIMIT 1")
    .bind(MARKETING_AI_SETTINGS_KEY)
    .first<{ value_json: string; updated_at: string }>();
  if (!row) return { settings: DEFAULT_MARKETING_AI_SETTINGS, revision: null as string | null };
  try {
    return { settings: normalizeMarketingAiSettings(JSON.parse(row.value_json)), revision: row.updated_at };
  } catch {
    return { settings: DEFAULT_MARKETING_AI_SETTINGS, revision: row.updated_at };
  }
}
import type { CustomerAiDatabase as MarketingAiDatabase } from "./customer-ai";
