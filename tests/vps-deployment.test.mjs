import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("VPS container uses Node 22 and a non-root runtime", async () => {
  const dockerfile = await read("Dockerfile");
  assert.match(dockerfile, /node:22-bookworm-slim/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /npm run build:vps/);
  assert.match(dockerfile, /\/api\/health/);
});

test("Compose isolates stateful services and gates app startup", async () => {
  const compose = await read("compose.yaml");
  for (const service of ["postgres", "minio", "minio-init", "migrate", "app", "nginx"]) {
    assert.match(compose, new RegExp(`^  ${service}:`, "m"));
  }
  assert.match(compose, /condition: service_completed_successfully/);
  assert.match(compose, /condition: service_healthy/);
  assert.match(compose, /postgres-data:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /minio-data:\/data/);

  const postgresBlock = compose.match(/  postgres:\n([\s\S]*?)\n  minio:/)?.[1] ?? "";
  const minioBlock = compose.match(/  minio:\n([\s\S]*?)\n  minio-init:/)?.[1] ?? "";
  assert.doesNotMatch(postgresBlock, /^    ports:/m);
  assert.doesNotMatch(minioBlock, /^    ports:/m);
});

test("Nginx forwards trusted proxy headers and limits uploads", async () => {
  const nginx = await read("deploy/nginx.conf");
  assert.match(nginx, /client_max_body_size 25m/);
  assert.match(nginx, /proxy_set_header X-Forwarded-For/);
  assert.match(nginx, /proxy_set_header X-Forwarded-Proto/);
  assert.match(nginx, /proxy_pass http:\/\/app:3000/);
});

test("VPS image contains the migration runner and SQL", async () => {
  const build = await read("scripts/build-vps.sh");
  assert.match(build, /migrate-postgres\.mjs/);
  assert.match(build, /drizzle-postgres/);
});

test("default npm start uses the VPS runtime and preserves an explicit Cloudflare command", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const startScript = await read("scripts/start-vps.sh");
  assert.equal(packageJson.scripts.start, "bash scripts/start-vps.sh");
  assert.match(packageJson.scripts["start:cloudflare"], /vinext start/);
  assert.match(startScript, /npm run build:vps/);
  assert.match(startScript, /IBEX_RUNTIME=node/);
  assert.match(startScript, /--env-file=\.env\.vps/);
  assert.match(startScript, /dist\/standalone\/server\.js/);
});
