import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for PostgreSQL migration.");
}
if (!/^postgres(?:ql)?:\/\//.test(connectionString)) {
  throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
}

const migrationDirectory = resolve(process.cwd(), "drizzle-postgres");
const migrationNames = (await readdir(migrationDirectory))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();
if (migrationNames.length === 0) {
  throw new Error("No PostgreSQL migration files were found.");
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECT_TIMEOUT_MS || "5000", 10),
  ssl:
    process.env.PGSSL === "require"
      ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
});

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ibex_schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const name of migrationNames) {
    const sql = await readFile(resolve(migrationDirectory, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await pool.query(
      "SELECT checksum FROM ibex_schema_migrations WHERE name=$1 LIMIT 1",
      [name],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration checksum changed: ${name}`);
      }
      console.log(`Migration already applied: ${name}`);
      continue;
    }

    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const statement of statements) await client.query(statement);
      await client.query(
        "INSERT INTO ibex_schema_migrations (name,checksum) VALUES ($1,$2)",
        [name, checksum],
      );
      await client.query("COMMIT");
      console.log(`Applied migration: ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
