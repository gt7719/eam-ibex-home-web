import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;

function sourceFiles(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...sourceFiles(path));
    else if (/\.(?:ts|tsx)$/.test(name)) result.push(path);
  }
  return result;
}

test("VPS migration isolates provider-specific environment imports", () => {
  const allowed = new Set([
    "app/runtime/env.ts",
  ]);
  const violations = [...sourceFiles(join(root, "app")), ...sourceFiles(join(root, "db"))]
    .filter((path) => readFileSync(path, "utf8").includes('from "cloudflare:workers"'))
    .map((path) => relative(root, path).replaceAll("\\", "/"))
    .filter((path) => !allowed.has(path));

  assert.deepEqual(violations, []);
});

test("runtime boundary exposes only the bindings used by application modules", () => {
  const source = readFileSync(join(root, "app/runtime/env.ts"), "utf8");
  const contracts = readFileSync(join(root, "app/runtime/contracts.ts"), "utf8");
  assert.match(source, /import type \{ RuntimeEnv \} from "\.\/contracts"/);
  assert.doesNotMatch(source, /Cloudflare\.Env/);
  assert.match(contracts, /interface RuntimeDatabase/);
  assert.match(contracts, /interface RuntimeObjectStorage/);
  assert.match(contracts, /interface RuntimeEnv/);
  assert.doesNotMatch(source, /OPENAI|PASSWORD|SECRET|SALT/);
});

test("Node runtime is selected at build time and fails closed before adapters exist", () => {
  const viteConfig = readFileSync(join(root, "vite.config.ts"), "utf8");
  const nodeProvider = readFileSync(join(root, "app/runtime/env.node.ts"), "utf8");
  const postgresProvider = readFileSync(join(root, "app/runtime/postgres.ts"), "utf8");
  const storageProvider = readFileSync(join(root, "app/runtime/s3-storage.ts"), "utf8");
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  assert.match(viteConfig, /process\.env\.IBEX_RUNTIME === "node"/);
  assert.match(viteConfig, /app\/runtime\/env\.node\.ts/);
  assert.match(nodeProvider, /RuntimeServiceUnavailableError/);
  assert.match(nodeProvider, /refusing every persistence operation/);
  assert.match(nodeProvider, /process\.env\.DATABASE_URL/);
  assert.match(postgresProvider, /class PostgresDatabase implements RuntimeDatabase/);
  assert.match(postgresProvider, /client\.query\("BEGIN"\)/);
  assert.match(postgresProvider, /client\.query\("ROLLBACK"\)/);
  assert.match(postgresProvider, /SQL placeholder mismatch/);
  assert.match(postgresProvider, /INSERT\\s\+OR\\s\+IGNORE/);
  assert.match(postgresProvider, /ON CONFLICT DO NOTHING/);
  assert.match(postgresProvider, /strpos/);
  assert.match(postgresProvider, /SQLite changes\(\) compatibility/);
  assert.match(postgresProvider, /previousChanges = Number/);
  assert.match(nodeProvider, /readS3StorageConfig/);
  assert.match(storageProvider, /class S3ObjectStorage implements RuntimeObjectStorage/);
  assert.match(storageProvider, /S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY/);
  assert.match(storageProvider, /transformToWebStream/);
  assert.equal(packageJson.scripts["build:vps"], "bash scripts/build-vps.sh");
  assert.match(readFileSync(join(root, "scripts/build-vps.sh"), "utf8"), /IBEX_RUNTIME=node vinext build/);
  assert.match(packageJson.scripts["start:vps"], /dist\/standalone\/server\.js/);
  assert.equal(packageJson.scripts["smoke:vps"], "node scripts/smoke-vps.mjs");
});

test("VPS lifecycle exposes health, dependency readiness and graceful shutdown", () => {
  const health = readFileSync(join(root, "app/api/health/route.ts"), "utf8");
  const ready = readFileSync(join(root, "app/api/ready/route.ts"), "utf8");
  const server = readFileSync(join(root, "scripts/vps-server.mjs"), "utf8");

  assert.match(health, /status: "ok"/);
  assert.match(ready, /SELECT 1 AS ready/);
  assert.match(ready, /status: "not_ready"/);
  assert.match(server, /SIGTERM/);
  assert.match(server, /server\.closeIdleConnections/);
  assert.match(server, /Graceful shutdown timed out/);
  assert.match(server, /validateVpsEnvironment/);
});

test("PostgreSQL schema mirrors every protected D1 table", () => {
  const d1Schema = readFileSync(join(root, "db/schema.ts"), "utf8");
  const postgresSchema = readFileSync(join(root, "db/schema.postgres.ts"), "utf8");
  const d1Tables = [...d1Schema.matchAll(/sqliteTable\(\s*["']([^"']+)/g)].map((match) => match[1]).sort();
  const postgresTables = [...postgresSchema.matchAll(/pgTable\(\s*["']([^"']+)/g)].map((match) => match[1]).sort();

  assert.equal(d1Tables.length, 33);
  assert.deepEqual(postgresTables, d1Tables);
  assert.doesNotMatch(postgresSchema, /sqliteTable|sqlite-core/);

  const migrationName = readdirSync(join(root, "drizzle-postgres")).find(
    (name) => /^0000_.+\.sql$/.test(name),
  );
  assert.ok(migrationName);
  const migration = readFileSync(join(root, "drizzle-postgres", migrationName), "utf8");
  assert.equal((migration.match(/^CREATE TABLE/gm) || []).length, 33);
  assert.doesNotMatch(migration, /PRAGMA|AUTOINCREMENT|strftime\(/);
});

test("PostgreSQL migrations are transactional and checksum protected", () => {
  const runner = readFileSync(join(root, "scripts/migrate-postgres.mjs"), "utf8");
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  assert.match(runner, /ibex_schema_migrations/);
  assert.match(runner, /createHash\("sha256"\)/);
  assert.match(runner, /Applied migration checksum changed/);
  assert.match(runner, /client\.query\("BEGIN"\)/);
  assert.match(runner, /client\.query\("ROLLBACK"\)/);
  assert.equal(packageJson.scripts["db:migrate:vps"], "node scripts/migrate-postgres.mjs");
});

test("data migration tools are fail-closed and reconcile every transfer", () => {
  const d1Import = readFileSync(join(root, "scripts/import-d1-to-postgres.mjs"), "utf8");
  const objectMigration = readFileSync(join(root, "scripts/migrate-r2-to-s3.mjs"), "utf8");
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  assert.match(d1Import, /Target table is not empty/);
  assert.match(d1Import, /Row reconciliation failed/);
  assert.match(d1Import, /client\.query\("ROLLBACK"\)/);
  assert.match(objectMigration, /ContinuationToken/);
  assert.match(objectMigration, /Object size reconciliation failed/);
  assert.match(objectMigration, /HeadObjectCommand/);
  assert.equal(packageJson.scripts["data:import:d1"], "node scripts/import-d1-to-postgres.mjs");
  assert.equal(packageJson.scripts["data:migrate:r2"], "node scripts/migrate-r2-to-s3.mjs");
});
