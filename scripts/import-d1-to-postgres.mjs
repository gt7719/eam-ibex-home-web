import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Pool } = pg;
const exportPath = process.env.D1_SQL_EXPORT
  ? resolve(process.env.D1_SQL_EXPORT)
  : null;
const connectionString = process.env.DATABASE_URL;
const reportPath = resolve(process.env.MIGRATION_REPORT || "migration-report-d1-postgres.json");

if (!exportPath) throw new Error("D1_SQL_EXPORT must point to a Wrangler D1 SQL export.");
if (!connectionString) throw new Error("DATABASE_URL is required.");

function sqlite(databasePath, sql, input) {
  const result = spawnSync("sqlite3", ["-json", databasePath, sql], {
    encoding: "utf8",
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error?.code === "ENOENT") {
    throw new Error("sqlite3 CLI is required to import a D1 export.");
  }
  if (result.status !== 0) {
    throw new Error(`sqlite3 failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : [];
}

function identifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier in migration source: ${value}`);
  }
  return `"${value}"`;
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "ibex-d1-import-"));
const sqlitePath = join(temporaryDirectory, "source.sqlite");
const pool = new Pool({
  connectionString,
  max: 1,
  ssl:
    process.env.PGSSL === "require"
      ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
});

try {
  const dump = await readFile(exportPath, "utf8");
  sqlite(sqlitePath, ".read /dev/stdin", dump);
  const sourceTables = sqlite(
    sqlitePath,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).map((row) => row.name);

  const targetTablesResult = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  const targetTables = new Set(targetTablesResult.rows.map((row) => row.table_name));
  const applicationTables = sourceTables.filter((table) => targetTables.has(table));
  const missingTargets = sourceTables.filter((table) => !targetTables.has(table));
  if (missingTargets.length) {
    throw new Error(`PostgreSQL schema is missing D1 tables: ${missingTargets.join(", ")}`);
  }

  const booleanColumnsResult = await pool.query(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND data_type='boolean'",
  );
  const booleanColumns = new Map();
  for (const row of booleanColumnsResult.rows) {
    const columns = booleanColumns.get(row.table_name) || new Set();
    columns.add(row.column_name);
    booleanColumns.set(row.table_name, columns);
  }

  const client = await pool.connect();
  const report = {
    source: basename(exportPath),
    startedAt: new Date().toISOString(),
    tables: [],
  };
  try {
    await client.query("BEGIN");
    for (const table of applicationTables) {
      const targetCount = await client.query(`SELECT COUNT(*)::bigint AS count FROM ${identifier(table)}`);
      if (Number(targetCount.rows[0].count) !== 0) {
        throw new Error(`Target table is not empty: ${table}`);
      }

      const rows = sqlite(sqlitePath, `SELECT * FROM ${identifier(table)}`);
      const booleans = booleanColumns.get(table) || new Set();
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        const values = columns.map((column) =>
          booleans.has(column) && row[column] !== null
            ? Boolean(Number(row[column]))
            : row[column],
        );
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(",");
        await client.query(
          `INSERT INTO ${identifier(table)} (${columns.map(identifier).join(",")}) VALUES (${placeholders})`,
          values,
        );
      }
      const importedCount = await client.query(`SELECT COUNT(*)::bigint AS count FROM ${identifier(table)}`);
      const target = Number(importedCount.rows[0].count);
      if (target !== rows.length) {
        throw new Error(`Row reconciliation failed for ${table}: source=${rows.length}, target=${target}`);
      }
      report.tables.push({ table, sourceRows: rows.length, targetRows: target });
    }
    await client.query("COMMIT");
    report.completedAt = new Date().toISOString();
    report.status = "completed";
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    console.log(`D1 import completed: ${applicationTables.length} tables. Report: ${reportPath}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
