// Conversation correlation only; this is never a login credential. randomUUID
// is unavailable on HTTP previews, while getRandomValues remains supported.
export function chatSessionId(random = globalThis.crypto) {
  if (typeof random?.randomUUID === "function") return `account-${random.randomUUID()}`;
  if (random?.getRandomValues) {
    const bytes = random.getRandomValues(new Uint8Array(16));
    return `account-${Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("")}`;
  }
  return `account-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
