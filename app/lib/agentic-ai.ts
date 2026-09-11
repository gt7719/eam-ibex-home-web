import type { KnowledgeEntry } from "./assistant-knowledge";

export const AGENTIC_TENANT = "DEMO-TENANT";
export const AGENTIC_USER = "demo.engineer";
export const MONTHLY_BUDGET_USD = 20;
export const BUDGET_WARNING_USD = 14;
export const BUDGET_CRITICAL_USD = 18;
export const PRIMARY_MODEL = "gpt-5.6-luna";
export const FALLBACK_MODEL = "gpt-5.6-terra";

export type ScenarioId = "bearing" | "thermal" | "complex";
export type ActionId = "inspect" | "email_team" | "bulk_schedule";
export type SiteLang = "mn" | "en";

export const scenarioIds = new Set<ScenarioId>(["bearing", "thermal", "complex"]);
export const actionIds = new Set<ActionId>(["inspect", "email_team", "bulk_schedule"]);

export type GroundedSource = {
  id: string;
  title: string;
  label: string;
  version: string;
  excerpt: string;
};

const stopWords = new Set(["нь", "ба", "юу", "ямар", "the", "and", "what", "how", "for"]);

function tokens(value: string) {
  return [...new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/).filter((x) => x.length > 1 && !stopWords.has(x)))];
}

export function retrieveApprovedKnowledge(entries: KnowledgeEntry[], query: string, lang: SiteLang): GroundedSource[] {
  const queryTokens = tokens(query);
  return entries
    .filter((entry) => entry.enabled && entry.status === "approved" && entry.visibility === "public")
    .map((entry) => {
      const content = lang === "en" ? entry.contentEn : entry.contentMn;
      const haystack = tokens(`${entry.titleMn} ${entry.titleEn} ${entry.keywords.join(" ")} ${content}`);
      const score = queryTokens.reduce((total, word) => total + (haystack.some((candidate) => candidate === word) ? 3 : haystack.some((candidate) => candidate.includes(word)) ? 1 : 0), 0);
      return { entry, content, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry, content }) => ({
      id: entry.id,
      title: lang === "en" ? entry.titleEn : entry.titleMn,
      label: entry.sourceLabel,
      version: entry.version,
      excerpt: content.slice(0, 420),
    }));
}

export function runIndustrialAnalytics(scenario: ScenarioId) {
  const samples = scenario === "thermal"
    ? [62.1, 63.0, 63.8, 65.4, 68.2, 72.6]
    : [2.1, 2.2, 2.4, 2.7, 3.5, 4.8];
  const baseline = samples.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;
  const latest = samples.at(-1) ?? baseline;
  const change = Number((((latest - baseline) / baseline) * 100).toFixed(1));
  return {
    engine: "Open-source analytics adapter",
    status: "simulated_rnd" as const,
    method: "rolling baseline + robust trend rule",
    signal: scenario === "thermal" ? "motor_temperature_c" : "bearing_vibration_mm_s",
    samples,
    latest,
    changePercent: change,
    severity: change >= 70 ? "high" : change >= 15 ? "medium" : "low",
    confidence: scenario === "complex" ? 0.76 : 0.84,
  };
}

export function runIbexEngineeringPlugin(scenario: ScenarioId) {
  return {
    pluginId: "ibex.shaft-bearing.demo.v1",
    owner: "iBeX Engineering",
    status: "rnd_validation" as const,
    finding: scenario === "thermal"
      ? "Thermal rise should be checked against load, lubrication and alignment evidence."
      : "Bearing/shaft signature requires engineer review before a failure mode is assigned.",
    protectedMethod: true,
  };
}

export function requiresAdminApproval(action: ActionId) {
  return action === "email_team" || action === "bulk_schedule";
}

export function selectModel(scenario: ScenarioId) {
  return scenario === "complex" ? FALLBACK_MODEL : PRIMARY_MODEL;
}

export function currentMonthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

export function estimatedCostUsd(model: string, inputChars: number, outputChars: number) {
  const inputTokens = Math.ceil(inputChars / 4);
  const outputTokens = Math.ceil(outputChars / 4);
  const rates = model === FALLBACK_MODEL ? { input: 2, output: 12 } : { input: 0.2, output: 1.2 };
  return Number(((inputTokens * rates.input + outputTokens * rates.output) / 1_000_000).toFixed(6));
}
