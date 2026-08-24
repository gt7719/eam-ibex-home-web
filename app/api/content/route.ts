import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

type ContentRow = { key: string; value_json: string; updated_at: string };

export async function GET() {
  const rows = await env.DB.prepare(
    "SELECT key, value_json, updated_at FROM site_content WHERE key IN ('pricing', 'partners', 'people')",
  ).all<ContentRow>();
  const content: Record<string, unknown> = {};
  let updatedAt: string | null = null;
  for (const row of rows.results || []) {
    try {
      content[row.key] = JSON.parse(row.value_json);
      if (!updatedAt || row.updated_at > updatedAt) updatedAt = row.updated_at;
    } catch {
      // Ignore a malformed record and let the embedded defaults render.
    }
  }
  return NextResponse.json(
    { content, updatedAt },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
  );
}
