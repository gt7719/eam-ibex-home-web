import { env } from "@/app/runtime/env";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET() {
  try {
    const [database] = await Promise.all([
      env.DB.prepare("SELECT 1 AS ready").first<{ ready: number }>(),
      env.BUCKET.get("__ibex_readiness_probe__"),
    ]);
    if (Number(database?.ready) !== 1) throw new Error("Database readiness query failed.");
    return new Response(JSON.stringify({ status: "ready" }), {
      status: 200,
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("vps_readiness_failed", error);
    return new Response(JSON.stringify({ status: "not_ready" }), {
      status: 503,
      headers: noStoreHeaders,
    });
  }
}
