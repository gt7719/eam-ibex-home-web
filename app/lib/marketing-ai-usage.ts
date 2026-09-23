import type { MarketingAiOpenAiPayload } from "./marketing-ai-openai";

export const MARKETING_AI_COST_CATALOG_VERSION = "estimate-2026-09-v1";

type Rate = { input: number; cachedInput: number; output: number };
const RATES: Array<{ match: RegExp; rate: Rate }> = [
  { match: /terra/i, rate: { input: 0.4, cachedInput: 0.1, output: 2.4 } },
  { match: /luna/i, rate: { input: 0.2, cachedInput: 0.05, output: 1.2 } },
  { match: /.*/, rate: { input: 0.4, cachedInput: 0.1, output: 2.4 } },
];

export function normalizeMarketingAiUsage(model: string, payload: MarketingAiOpenAiPayload) {
  const inputTokens = Math.max(0, Number(payload.usage?.input_tokens || 0));
  const outputTokens = Math.max(0, Number(payload.usage?.output_tokens || 0));
  const cachedInputTokens = Math.min(inputTokens, Math.max(0, Number(payload.usage?.input_tokens_details?.cached_tokens || 0)));
  const reasoningTokens = Math.min(outputTokens, Math.max(0, Number(payload.usage?.output_tokens_details?.reasoning_tokens || 0)));
  const rate = RATES.find(item => item.match.test(model))!.rate;
  const regularInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const estimatedCostUsd = Number(((regularInputTokens * rate.input + cachedInputTokens * rate.cachedInput + outputTokens * rate.output) / 1_000_000).toFixed(6));
  return { inputTokens, outputTokens, cachedInputTokens, reasoningTokens, estimatedCostUsd, catalogVersion: MARKETING_AI_COST_CATALOG_VERSION };
}
