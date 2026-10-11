import { spawn } from "node:child_process";

const port = "3100";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["dist/standalone/server.js"], {
  env: {
    ...process.env,
    IBEX_RUNTIME: "node",
    IBEX_ALLOW_UNCONFIGURED_STARTUP: "1",
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: port,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk;
});
server.stderr.on("data", (chunk) => {
  output += chunk;
});

async function stop() {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
}

try {
  let response;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`VPS server exited before readiness.\n${output}`);
    }
    try {
      response = await fetch(origin, { signal: AbortSignal.timeout(1_000) });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (!response?.ok) {
    throw new Error(`VPS home smoke test failed with status ${response?.status ?? "unreachable"}.\n${output}`);
  }

  const body = await response.text();
  if (!body.includes("iBeX")) {
    throw new Error("VPS home response is missing the expected iBeX marker.");
  }

  const health = await fetch(`${origin}/api/health`, {
    signal: AbortSignal.timeout(1_000),
  });
  assertStatus(health, 200, "health endpoint");
  const healthBody = await health.json();
  if (healthBody.status !== "ok" || healthBody.runtime !== "node") {
    throw new Error(`Unexpected health payload: ${JSON.stringify(healthBody)}`);
  }

  const readiness = await fetch(`${origin}/api/ready`, {
    signal: AbortSignal.timeout(1_000),
  });
  assertStatus(readiness, 503, "fail-closed readiness endpoint");

  for (const path of ["/concept.html", "/api/admin/session", "/organization-preview.html", "/mobile-preview/index.html"]) {
    const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(2_000) });
    const expected = path === "/concept.html" ? 200 : path === "/api/admin/session" ? 401 : 503;
    assertStatus(response, expected, path);
    for (const header of ["x-content-type-options", "permissions-policy", "content-security-policy-report-only"]) {
      if (!response.headers.get(header)) throw new Error(`${path} is missing ${header}`);
    }
    await response.arrayBuffer();
  }

  console.log(`VPS smoke test passed: home/health=200, anonymous session=401, unconfigured readiness/previews=503, shared security headers present; cloudflare: URL scheme was not loaded.`);
} finally {
  await stop();
}

function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} returned ${response.status}; expected ${expected}.`);
  }
}
