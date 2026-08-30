import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { readPackageState } from "../../lib/packages";
import { pricingRows } from "../../../public/package-model.mjs";

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
  const {state} = await readPackageState();
  content.pricing = pricingRows(state.published);
  return NextResponse.json(
    { content, updatedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
