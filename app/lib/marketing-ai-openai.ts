export type MarketingAiOpenAiErrorCode = "OUTPUT_INCOMPLETE" | "OPENAI_AUTH_ERROR" | "OPENAI_ACCESS_DENIED" | "OPENAI_RATE_LIMIT" | "OPENAI_TIMEOUT" | "OPENAI_REQUEST_INVALID" | "OPENAI_UNAVAILABLE";
export type MarketingAiOpenAiPayload = { status?: string; incomplete_details?: { reason?: string } | null; output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number } };
export class MarketingAiOpenAiError extends Error {
  code: MarketingAiOpenAiErrorCode;
  httpStatus: number;
  constructor(code: MarketingAiOpenAiErrorCode, httpStatus = 502, message = code) { super(message); this.name = "MarketingAiOpenAiError"; this.code = code; this.httpStatus = httpStatus; }
}
export function marketingAiOutputText(payload: MarketingAiOpenAiPayload) {
  if (payload.status === "incomplete") throw new MarketingAiOpenAiError("OUTPUT_INCOMPLETE", 502, payload.incomplete_details?.reason || "response_incomplete");
  const value = payload.output_text || (payload.output || []).flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text || "").join("");
  if (!value) throw new MarketingAiOpenAiError("OUTPUT_INCOMPLETE", 502, "empty_output");
  return value;
}
export function parseMarketingAiStructuredOutput<T>(payload: MarketingAiOpenAiPayload) {
  try { return JSON.parse(marketingAiOutputText(payload)) as T; }
  catch (error) { if (error instanceof MarketingAiOpenAiError) throw error; throw new MarketingAiOpenAiError("OUTPUT_INCOMPLETE", 502, "invalid_or_truncated_json"); }
}
export async function marketingAiOpenAiHttpError(response: Response) {
  if (response.status === 401) return new MarketingAiOpenAiError("OPENAI_AUTH_ERROR", 502);
  if (response.status === 403) return new MarketingAiOpenAiError("OPENAI_ACCESS_DENIED", 502);
  if (response.status === 429) return new MarketingAiOpenAiError("OPENAI_RATE_LIMIT", 429);
  if (response.status === 400) return new MarketingAiOpenAiError("OPENAI_REQUEST_INVALID", 409);
  return new MarketingAiOpenAiError("OPENAI_UNAVAILABLE", 502, `openai_${response.status}`);
}
export function normalizeMarketingAiOpenAiError(error: unknown) {
  if (error instanceof MarketingAiOpenAiError) return error;
  if (error instanceof DOMException && error.name === "TimeoutError") return new MarketingAiOpenAiError("OPENAI_TIMEOUT", 504);
  if (error instanceof Error && /timeout|aborted/i.test(`${error.name} ${error.message}`)) return new MarketingAiOpenAiError("OPENAI_TIMEOUT", 504);
  return new MarketingAiOpenAiError("OPENAI_UNAVAILABLE", 502);
}
export function marketingAiOpenAiMessage(code: MarketingAiOpenAiErrorCode, lang: "mn" | "en") {
  const messages: Record<MarketingAiOpenAiErrorCode, { mn: string; en: string }> = {
    OUTPUT_INCOMPLETE: { mn: "OpenAI-ийн structured хариулт тасарсан эсвэл бүрэн JSON болж дууссангүй. Max output token-ийг нэмээд дахин оролдоно уу.", en: "The structured OpenAI response was truncated or invalid. Increase max output tokens and try again." },
    OPENAI_AUTH_ERROR: { mn: "Marketing OpenAI API key баталгаажсангүй. Sites secret болон redeploy-ийг шалгана уу.", en: "The Marketing OpenAI API key could not be authenticated. Check the Sites secret and redeploy." },
    OPENAI_ACCESS_DENIED: { mn: "Marketing OpenAI project сонгосон model-д хандах эрхгүй байна.", en: "The Marketing OpenAI project cannot access the selected model." },
    OPENAI_RATE_LIMIT: { mn: "OpenAI хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоно уу.", en: "The OpenAI request limit was reached. Try again shortly." },
    OPENAI_TIMEOUT: { mn: "OpenAI хариу өгөх хугацаа хэтэрлээ. Дахин оролдоно уу.", en: "The OpenAI response timed out. Try again." },
    OPENAI_REQUEST_INVALID: { mn: "Model, reasoning эсвэл structured output тохиргоо хүчинтэй биш байна.", en: "The model, reasoning, or structured-output configuration is invalid." },
    OPENAI_UNAVAILABLE: { mn: "OpenAI одоогоор Draft бэлтгэж чадсангүй. Түр хүлээгээд дахин оролдоно уу.", en: "OpenAI could not prepare the draft right now. Try again shortly." },
  };
  return messages[code][lang];
}
