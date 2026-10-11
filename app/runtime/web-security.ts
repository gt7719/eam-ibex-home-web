import type { RuntimeDatabase } from "./contracts";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy-Report-Only": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: https:; media-src 'self' https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com",
};

export function withSecurityHeaders(response: Response) {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) secured.headers.set(name, value);
  return secured;
}

function normalizedPath(pathname: string): string {
  try {
    return new URL(decodeURIComponent(pathname).replaceAll("\\", "/"), "https://route.invalid").pathname;
  } catch { return pathname; }
}

export function protectedEnvironment(pathname: string): "web" | "mobile" | null {
  pathname = normalizedPath(pathname);
  if (pathname === "/organization-preview.html") return "web";
  if (pathname === "/mobile-preview" || pathname.startsWith("/mobile-preview/")) return "mobile";
  return null;
}

export async function hasActiveAdminSession(request: Request, env: { DB: RuntimeDatabase }) {
  const cookie = (request.headers.get("cookie") || "").split(";")
    .find((part) => part.trim().startsWith("ibex_site_session="));
  if (!cookie) return false;
  let token: string;
  try { token = decodeURIComponent(cookie.trim().slice("ibex_site_session=".length)); }
  catch { return false; }
  if (!token || token.length > 1024) return false;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const row = await env.DB.prepare(
    `SELECT 1 AS allowed FROM admin_sessions s INNER JOIN admin_users u ON u.id=s.user_id
     WHERE s.token_hash=? AND s.expires_at>? AND u.status='active' LIMIT 1`,
  ).bind(tokenHash, new Date().toISOString()).first<{ allowed: number }>();
  return Number(row?.allowed) === 1;
}

export async function previewAccessResponse(request: Request, env: { DB: RuntimeDatabase }): Promise<Response | null> {
  const url = new URL(request.url), environmentId = protectedEnvironment(url.pathname);
  if (!environmentId) return null;
  try {
    const row = await env.DB.prepare("SELECT value_json FROM site_content WHERE key='headerNavigation' LIMIT 1")
      .first<{ value_json: string }>();
    const config = row?.value_json ? JSON.parse(row.value_json) as {
      environments?: Array<{ id?: string; visible?: boolean }>;
    } : null;
    const visible = config?.environments?.find((item) => item.id === environmentId)?.visible !== false;
    // Relative CSS/JS requests do not inherit the entry page's query string.
    const mobileAsset = environmentId === "mobile" && ![
      "/mobile-preview", "/mobile-preview/", "/mobile-preview/index.html",
    ].includes(normalizedPath(url.pathname));
    const adminRequest = url.searchParams.get("adminPreview") === "1" || mobileAsset;
    if (visible || (adminRequest && await hasActiveAdminSession(request, env))) return null;
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("preview_access_check_failed", error);
    return new Response("Service unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
