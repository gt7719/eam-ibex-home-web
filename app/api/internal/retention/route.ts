import { env } from "@/app/runtime/env";
import { runDataRetention } from "../../../lib/data-retention";

export async function POST(request: Request) {
  const token = (env as unknown as { IBEX_INTERNAL_RETENTION_TOKEN?: string }).IBEX_INTERNAL_RETENTION_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) return new Response(null, { status: 404 });
  try {
    return Response.json(await runDataRetention(env), { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("retention_cleanup_failed");
    return Response.json({ error: "Cleanup unavailable" }, { status: 503 });
  }
}
