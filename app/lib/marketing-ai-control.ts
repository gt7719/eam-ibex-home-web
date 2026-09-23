import type { CustomerAiDatabase as MarketingAiDatabase } from "./customer-ai";

export type MarketingAiMode = "disabled" | "test" | "production";
export type MarketingAiPromptProfile = "general" | "content" | "campaign" | "lead_followup" | "report";

export type MarketingAiControlSettings = {
  schemaVersion: 2;
  mode: MarketingAiMode;
  model: string;
  fastModel: string;
  detailedModel: string;
  fallbackModel: string;
  reasoningEffort: "low" | "medium" | "high";
  verbosity: "low" | "medium" | "high";
  defaultPromptProfile: MarketingAiPromptProfile;
  brandTone: string;
  approvedClaims: string;
  prohibitedClaims: string;
  monthlyBudgetUsd: number;
  warningBudgetUsd: number;
  criticalBudgetUsd: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  maxOutputTokens: number;
  testedAt: string;
  testedFingerprint: string;
  testedBy: string;
  humanApprovalRequired: true;
  outboundEnabled: false;
};

export const MARKETING_AI_SETTINGS_KEY = "marketingAiControl";
export const MARKETING_AI_PROMPT_VERSION = "marketing-admin-v2";

export const DEFAULT_MARKETING_AI_SETTINGS: MarketingAiControlSettings = {
  schemaVersion: 2, mode: "disabled", model: "gpt-5.6-luna", fastModel: "gpt-5.6-luna",
  detailedModel: "gpt-5.6-terra", fallbackModel: "gpt-5.6-luna", reasoningEffort: "medium", verbosity: "medium",
  defaultPromptProfile: "general", brandTone: "Мэргэжлийн, ойлгомжтой, баримтад тулгуурласан", approvedClaims: "", prohibitedClaims: "",
  monthlyBudgetUsd: 10, warningBudgetUsd: 5, criticalBudgetUsd: 8, requestsPerMinute: 4, requestsPerDay: 30, maxOutputTokens: 700,
  testedAt: "", testedFingerprint: "", testedBy: "", humanApprovalRequired: true, outboundEnabled: false,
};

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
function safeModel(value: unknown, fallback: string) { return typeof value === "string" && /^[a-zA-Z0-9._:-]{2,80}$/.test(value.trim()) ? value.trim() : fallback; }
function safeText(value: unknown, fallback: string, maximum: number) { return typeof value === "string" ? value.trim().slice(0, maximum) : fallback; }

export function normalizeMarketingAiSettings(value: unknown): MarketingAiControlSettings {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const mode: MarketingAiMode = row.mode === "disabled" || row.mode === "test" || row.mode === "production" ? row.mode : DEFAULT_MARKETING_AI_SETTINGS.mode;
  const monthlyBudgetUsd = boundedNumber(row.monthlyBudgetUsd, DEFAULT_MARKETING_AI_SETTINGS.monthlyBudgetUsd, 1, 1_000_000);
  const warningBudgetUsd = boundedNumber(row.warningBudgetUsd, DEFAULT_MARKETING_AI_SETTINGS.warningBudgetUsd, 0.01, monthlyBudgetUsd);
  const criticalBudgetUsd = boundedNumber(row.criticalBudgetUsd, DEFAULT_MARKETING_AI_SETTINGS.criticalBudgetUsd, warningBudgetUsd, monthlyBudgetUsd);
  const legacyModel = safeModel(row.model, DEFAULT_MARKETING_AI_SETTINGS.model);
  const profile = ["general", "content", "campaign", "lead_followup", "report"].includes(String(row.defaultPromptProfile)) ? row.defaultPromptProfile as MarketingAiPromptProfile : DEFAULT_MARKETING_AI_SETTINGS.defaultPromptProfile;
  const reasoningEffort = ["low", "medium", "high"].includes(String(row.reasoningEffort)) ? row.reasoningEffort as MarketingAiControlSettings["reasoningEffort"] : DEFAULT_MARKETING_AI_SETTINGS.reasoningEffort;
  const verbosity = ["low", "medium", "high"].includes(String(row.verbosity)) ? row.verbosity as MarketingAiControlSettings["verbosity"] : DEFAULT_MARKETING_AI_SETTINGS.verbosity;
  const fastModel = safeModel(row.fastModel, legacyModel);
  return {
    schemaVersion: 2, mode, model: fastModel, fastModel,
    detailedModel: safeModel(row.detailedModel, DEFAULT_MARKETING_AI_SETTINGS.detailedModel), fallbackModel: safeModel(row.fallbackModel, fastModel),
    reasoningEffort, verbosity, defaultPromptProfile: profile,
    brandTone: safeText(row.brandTone, DEFAULT_MARKETING_AI_SETTINGS.brandTone, 500), approvedClaims: safeText(row.approvedClaims, "", 4_000), prohibitedClaims: safeText(row.prohibitedClaims, "", 4_000),
    monthlyBudgetUsd, warningBudgetUsd, criticalBudgetUsd,
    requestsPerMinute: Math.round(boundedNumber(row.requestsPerMinute, DEFAULT_MARKETING_AI_SETTINGS.requestsPerMinute, 1, 60)),
    requestsPerDay: Math.round(boundedNumber(row.requestsPerDay, DEFAULT_MARKETING_AI_SETTINGS.requestsPerDay, 1, 1_000)),
    maxOutputTokens: Math.round(boundedNumber(row.maxOutputTokens, DEFAULT_MARKETING_AI_SETTINGS.maxOutputTokens, 120, 4_000)),
    testedAt: safeText(row.testedAt, "", 80), testedFingerprint: safeText(row.testedFingerprint, "", 128), testedBy: safeText(row.testedBy, "", 100),
    humanApprovalRequired: true, outboundEnabled: false,
  };
}

function fingerprintInput(settings: MarketingAiControlSettings) {
  return JSON.stringify({ promptVersion: MARKETING_AI_PROMPT_VERSION, fastModel: settings.fastModel, detailedModel: settings.detailedModel, fallbackModel: settings.fallbackModel,
    reasoningEffort: settings.reasoningEffort, verbosity: settings.verbosity, defaultPromptProfile: settings.defaultPromptProfile, brandTone: settings.brandTone,
    approvedClaims: settings.approvedClaims, prohibitedClaims: settings.prohibitedClaims, maxOutputTokens: settings.maxOutputTokens, humanApprovalRequired: true, outboundEnabled: false });
}
export async function marketingAiSettingsFingerprint(settings: MarketingAiControlSettings) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprintInput(settings)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function marketingAiSettingsIsTested(settings: MarketingAiControlSettings) {
  return Boolean(settings.testedAt && settings.testedFingerprint && settings.testedFingerprint === await marketingAiSettingsFingerprint(settings));
}
export async function readMarketingAiSettings(db: MarketingAiDatabase) {
  const row = await db.prepare("SELECT value_json, updated_at FROM site_content WHERE key = ? LIMIT 1").bind(MARKETING_AI_SETTINGS_KEY).first<{ value_json: string; updated_at: string }>();
  if (!row) return { settings: DEFAULT_MARKETING_AI_SETTINGS, revision: null as string | null };
  try { return { settings: normalizeMarketingAiSettings(JSON.parse(row.value_json)), revision: row.updated_at }; }
  catch { return { settings: DEFAULT_MARKETING_AI_SETTINGS, revision: row.updated_at }; }
}
