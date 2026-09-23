export type HomeAiOpenAiErrorCode =
  | "PROMPT_NOT_FOUND"
  | "PROMPT_VERSION_INVALID"
  | "OUTPUT_INCOMPLETE"
  | "OPENAI_AUTH_ERROR"
  | "OPENAI_ACCESS_DENIED"
  | "OPENAI_RATE_LIMIT"
  | "OPENAI_TIMEOUT"
  | "OPENAI_REQUEST_INVALID"
  | "OPENAI_UNAVAILABLE";

export type HomeAiOpenAiPayload = {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class HomeAiOpenAiError extends Error {
  code: HomeAiOpenAiErrorCode;
  httpStatus: number;

  constructor(code: HomeAiOpenAiErrorCode, httpStatus = 502, message = code) {
    super(message);
    this.name = "HomeAiOpenAiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function homeAiOutputText(payload: HomeAiOpenAiPayload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text || "")
    .join("");
}

export function homeAiCompletedOutputText(payload: HomeAiOpenAiPayload) {
  if (payload.status === "incomplete") {
    throw new HomeAiOpenAiError("OUTPUT_INCOMPLETE", 502, payload.incomplete_details?.reason || "response_incomplete");
  }
  const text = homeAiOutputText(payload);
  if (!text) throw new HomeAiOpenAiError("OUTPUT_INCOMPLETE", 502, "empty_output");
  return text;
}

export function parseHomeAiStructuredOutput<T>(payload: HomeAiOpenAiPayload) {
  const text = homeAiCompletedOutputText(payload);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HomeAiOpenAiError("OUTPUT_INCOMPLETE", 502, "invalid_or_truncated_json");
  }
}

export async function homeAiOpenAiHttpError(response: Response, publishedPrompt: boolean, hasVersion: boolean) {
  const payload = await response.json().catch(() => null) as { error?: { message?: string; code?: string; param?: string } } | null;
  const detail = [payload?.error?.message, payload?.error?.code, payload?.error?.param].filter(Boolean).join(" ").toLowerCase();
  if (publishedPrompt && hasVersion && /version/.test(detail)) {
    return new HomeAiOpenAiError("PROMPT_VERSION_INVALID", 409);
  }
  if (publishedPrompt && (response.status === 404 || (/prompt/.test(detail) && /not found|unknown|missing/.test(detail)))) {
    return new HomeAiOpenAiError("PROMPT_NOT_FOUND", 409);
  }
  if (response.status === 401) return new HomeAiOpenAiError("OPENAI_AUTH_ERROR", 502);
  if (response.status === 403) return new HomeAiOpenAiError("OPENAI_ACCESS_DENIED", 502);
  if (response.status === 429) return new HomeAiOpenAiError("OPENAI_RATE_LIMIT", 429);
  if (response.status === 400) return new HomeAiOpenAiError("OPENAI_REQUEST_INVALID", 409);
  return new HomeAiOpenAiError("OPENAI_UNAVAILABLE", 502, `openai_${response.status}`);
}

export function normalizeHomeAiOpenAiError(error: unknown) {
  if (error instanceof HomeAiOpenAiError) return error;
  if (error instanceof DOMException && error.name === "TimeoutError") return new HomeAiOpenAiError("OPENAI_TIMEOUT", 504);
  if (error instanceof Error && /timeout|aborted/i.test(`${error.name} ${error.message}`)) return new HomeAiOpenAiError("OPENAI_TIMEOUT", 504);
  return new HomeAiOpenAiError("OPENAI_UNAVAILABLE", 502);
}

export function homeAiOpenAiMessage(code: HomeAiOpenAiErrorCode, lang: "mn" | "en") {
  const messages: Record<HomeAiOpenAiErrorCode, { mn: string; en: string }> = {
    PROMPT_NOT_FOUND: { mn: "Published Prompt ID олдсонгүй. OpenAI Prompt ID-г шалгаад дахин тестлэнэ үү.", en: "The Published Prompt ID was not found. Check the OpenAI Prompt ID and test again." },
    PROMPT_VERSION_INVALID: { mn: "Prompt-ийн сонгосон хувилбар хүчинтэй биш байна. Version-ийг шалгаад дахин тестлэнэ үү.", en: "The selected prompt version is invalid. Check the version and test again." },
    OUTPUT_INCOMPLETE: { mn: "OpenAI-ийн хариулт token-ийн хязгаарт тасарсан эсвэл бүрэн JSON болж дууссангүй. Max output token-ийг нэмээд дахин оролдоно уу.", en: "The OpenAI response was truncated by the token limit or did not finish as valid JSON. Increase max output tokens and try again." },
    OPENAI_AUTH_ERROR: { mn: "OpenAI API key баталгаажсангүй. Server-ийн нууц key-г шалгана уу.", en: "The OpenAI API key could not be authenticated. Check the server secret." },
    OPENAI_ACCESS_DENIED: { mn: "OpenAI project энэ model эсвэл prompt-д хандах эрхгүй байна.", en: "The OpenAI project cannot access this model or prompt." },
    OPENAI_RATE_LIMIT: { mn: "OpenAI хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоно уу.", en: "The OpenAI request limit was reached. Please try again shortly." },
    OPENAI_TIMEOUT: { mn: "OpenAI хариу өгөх хугацаа хэтэрлээ. Дахин оролдоно уу.", en: "The OpenAI response timed out. Please try again." },
    OPENAI_REQUEST_INVALID: { mn: "OpenAI хүсэлтийн тохиргоо хүчинтэй биш байна. Model, prompt болон output тохиргоог шалгана уу.", en: "The OpenAI request configuration is invalid. Check the model, prompt, and output settings." },
    OPENAI_UNAVAILABLE: { mn: "OpenAI одоогоор хариулт боловсруулж чадсангүй. Түр хүлээгээд дахин оролдоно уу.", en: "OpenAI could not prepare a response right now. Please try again shortly." },
  };
  return messages[code][lang];
}
