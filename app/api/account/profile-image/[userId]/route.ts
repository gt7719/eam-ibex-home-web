import { env } from "cloudflare:workers";
import {
  getAdminSession,
  hasAdminPermission,
} from "../../../../lib/site-admin";
import { getSiteUserSession } from "../../../../lib/site-user-auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(userId))
    return new Response("Not found", { status: 404 });
  const [siteUser, admin] = await Promise.all([
    getSiteUserSession(),
    getAdminSession(),
  ]);
  if (
    siteUser?.id !== userId &&
    !(admin && hasAdminPermission(admin, "accounts.manage"))
  )
    return new Response("Not found", { status: 404 });
  const image = await env.DB.prepare(
    "SELECT object_key,content_type,filename FROM site_user_profile_images WHERE user_id=? LIMIT 1",
  )
    .bind(userId)
    .first<{ object_key: string; content_type: string; filename: string }>();
  if (!image) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(image.object_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", image.content_type);
  headers.set(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(image.filename)}`,
  );
  headers.set("Cache-Control", "private, no-store");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
