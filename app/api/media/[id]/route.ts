import { env } from "@/app/runtime/env";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const record = await env.DB.prepare(
    "SELECT object_key, content_type, filename FROM media_assets WHERE id = ? LIMIT 1",
  )
    .bind(id)
    .first<{ object_key: string; content_type: string; filename: string }>();
  if (!record) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(record.object_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  const legacySvg = record.content_type === "image/svg+xml";
  headers.set("Content-Type", legacySvg ? "application/octet-stream" : record.content_type);
  headers.set("Content-Disposition", `${legacySvg || record.content_type === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(record.filename)}`);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
