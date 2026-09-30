const noStoreHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "eam-ibex-home-web",
      runtime: process.env.IBEX_RUNTIME === "node" ? "node" : "cloudflare",
    }),
    { status: 200, headers: noStoreHeaders },
  );
}
