export type JsonReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413; error: string };

export async function readBoundedText(request: Request | Response, maximumBytes: number) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { ok: false as const, status: 413 as const, error: "Хүсэлт хэт том байна." };
  }
  if (!request.body) return { ok: true as const, value: "" };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let value = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        return { ok: false as const, status: 413 as const, error: "Хүсэлт хэт том байна." };
      }
      value += decoder.decode(chunk.value, { stream: true });
    }
    value += decoder.decode();
    return { ok: true as const, value };
  } catch {
    return { ok: false as const, status: 400 as const, error: "Хүсэлтийг уншиж чадсангүй." };
  }
}

export async function readJsonObject<T extends object = Record<string, unknown>>(
  request: Request,
  maximumBytes = 32_000,
): Promise<JsonReadResult<T>> {
  const text = await readBoundedText(request, maximumBytes);
  if (!text.ok) return text;
  try {
    const parsed = JSON.parse(text.value || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: "Хүсэлтийн формат буруу байна." };
    }
    return { ok: true, value: parsed as T };
  } catch {
    return { ok: false, status: 400, error: "Хүсэлтийн формат буруу байна." };
  }
}
