/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type EnvironmentId = "web" | "mobile";

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return "";
      }
    }
  }
  return "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hasActiveAdminSession(request: Request, env: Env) {
  const token = cookieValue(request, "ibex_site_session");
  if (!token) return false;
  const row = await env.DB.prepare(
    `SELECT 1 AS allowed
     FROM admin_sessions s
     INNER JOIN admin_users u ON u.id=s.user_id
     WHERE s.token_hash=? AND s.expires_at>? AND u.status='active'
     LIMIT 1`,
  ).bind(await sha256(token), new Date().toISOString()).first<{ allowed: number }>();
  return row?.allowed === 1;
}

async function environmentIsVisible(env: Env, id: EnvironmentId) {
  const row = await env.DB.prepare("SELECT value_json FROM site_content WHERE key='headerNavigation' LIMIT 1")
    .first<{ value_json: string }>();
  if (!row?.value_json) return true;
  try {
    const parsed = JSON.parse(row.value_json) as { environments?: Array<{ id?: string; visible?: boolean }> };
    const environment = parsed.environments?.find((item) => item?.id === id);
    return environment?.visible !== false;
  } catch {
    return true;
  }
}

function protectedEnvironment(pathname: string): EnvironmentId | null {
  if (pathname === "/organization-preview.html") return "web";
  if (pathname === "/mobile-preview" || pathname === "/mobile-preview/" || pathname === "/mobile-preview/index.html") return "mobile";
  return null;
}

function withSecurityHeaders(response: Response) {
  const secured = new Response(response.body, response);
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  secured.headers.set(
    "Content-Security-Policy-Report-Only",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: https:; media-src 'self' https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com",
  );
  return secured;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const environmentId = protectedEnvironment(url.pathname);
    if (environmentId && !(await environmentIsVisible(env, environmentId))) {
      const adminPreview = url.searchParams.get("adminPreview") === "1";
      if (!adminPreview || !(await hasActiveAdminSession(request, env))) {
        return withSecurityHeaders(new Response("Not found", {
          status: 404,
          headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
        }));
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withSecurityHeaders(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths));
    }

    return withSecurityHeaders(await handler.fetch(request, env, ctx));
  },
};

export default worker;
