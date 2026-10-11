import { env } from "@/app/runtime/env";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

async function checkStorage() {
  if (env.BUCKET.checkReadiness) return env.BUCKET.checkReadiness();
  // Cloudflare owns the R2 binding/bucket. Cancel a probe body if one exists.
  const probe = await env.BUCKET.get("__ibex_readiness_probe__");
  await probe?.body.cancel();
}

export async function GET() {
  try {
    const [database] = await Promise.all([
      env.DB.prepare("SELECT 1 AS ready").first<{ ready: number }>(),
      checkStorage(),
      env.DB.prepare("SELECT u.id FROM site_users u CROSS JOIN admin_users a CROSS JOIN site_content c LIMIT 0").run(),
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
