import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after } from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = new URL("..", import.meta.url).pathname;
const temporaryDirectory = await mkdtemp(join(root, ".postgres-runtime-test-"));
const compiledPath = join(temporaryDirectory, "postgres.mjs");
const source = await readFile(join(root, "app/runtime/postgres.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
await writeFile(compiledPath, compiled);
const { toPostgresSql } = await import(`${pathToFileURL(compiledPath).href}?test=${Date.now()}`);

after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

test("PostgreSQL adapter converts only real D1 placeholders", () => {
  const sql = "SELECT '?' AS literal, value FROM records WHERE id=? -- ? stays\n AND status=?";
  assert.equal(
    toPostgresSql(sql, 2),
    "SELECT '?' AS literal, value FROM records WHERE id=$1 -- ? stays\n AND status=$2",
  );
  assert.throws(() => toPostgresSql("SELECT * FROM records WHERE id=?", 0), /placeholder mismatch/);
});

test("PostgreSQL adapter preserves D1 batch conflict and changes semantics", () => {
  assert.equal(
    toPostgresSql(
      "INSERT OR IGNORE INTO outbox (id) SELECT ? WHERE changes()=1",
      1,
      1,
    ),
    "INSERT INTO outbox (id) SELECT $1 WHERE 1=1 ON CONFLICT DO NOTHING",
  );
  assert.throws(
    () => toPostgresSql("INSERT INTO outbox (id) SELECT ? WHERE changes()=1", 1),
    /only inside an atomic batch/,
  );
});

test("PostgreSQL adapter maps SQLite media reference lookup to strpos", () => {
  assert.equal(
    toPostgresSql("SELECT key FROM content WHERE instr(value_json, ?) > 0", 1),
    "SELECT key FROM content WHERE strpos(value_json, $1) > 0",
  );
});
