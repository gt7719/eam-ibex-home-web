import { Pool, type PoolClient, type QueryResult } from "pg";
import type {
  RuntimeDatabase,
  RuntimePreparedStatement,
  RuntimeQueryResult,
} from "./contracts";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

/** Convert D1 positional placeholders to PostgreSQL placeholders safely. */
export function toPostgresSql(
  sql: string,
  valueCount: number,
  previousChanges?: number,
): string {
  const ignoresConflicts = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);
  let normalizedSql = sql
    .replace(/^(\s*)INSERT\s+OR\s+IGNORE\s+INTO\b/i, "$1INSERT INTO")
    .replace(/\binstr\s*\(/gi, "strpos(");

  if (/\bchanges\s*\(\s*\)/i.test(normalizedSql)) {
    if (previousChanges === undefined) {
      throw new Error("SQLite changes() compatibility is available only inside an atomic batch.");
    }
    normalizedSql = normalizedSql.replace(
      /\bchanges\s*\(\s*\)/gi,
      String(previousChanges),
    );
  }

  let result = "";
  let parameter = 0;
  let quote: "'" | '"' | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < normalizedSql.length; index += 1) {
    const character = normalizedSql[index];
    const next = normalizedSql[index + 1];

    if (lineComment) {
      result += character;
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      result += character;
      if (character === "*" && next === "/") {
        result += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      result += character;
      if (character === quote) {
        if (next === quote) {
          result += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === "-" && next === "-") {
      result += character + next;
      index += 1;
      lineComment = true;
      continue;
    }
    if (character === "/" && next === "*") {
      result += character + next;
      index += 1;
      blockComment = true;
      continue;
    }
    if (character === "'" || character === '"') {
      result += character;
      quote = character;
      continue;
    }
    if (character === "?") {
      parameter += 1;
      result += `$${parameter}`;
      continue;
    }
    result += character;
  }

  if (parameter !== valueCount) {
    throw new Error(
      `SQL placeholder mismatch: query has ${parameter}, but ${valueCount} values were bound.`,
    );
  }
  if (ignoresConflicts) {
    const semicolon = result.match(/;\s*$/);
    result = semicolon
      ? `${result.slice(0, semicolon.index)} ON CONFLICT DO NOTHING${semicolon[0]}`
      : `${result} ON CONFLICT DO NOTHING`;
  }
  return result;
}

function runtimeResult<T extends Record<string, unknown>>(
  queryResult: QueryResult<T>,
  duration: number,
): RuntimeQueryResult<T> {
  return {
    results: queryResult.rows,
    success: true,
    meta: {
      changes: queryResult.rowCount ?? 0,
      duration,
    },
  };
}

class PostgresPreparedStatement implements RuntimePreparedStatement {
  constructor(
    private readonly database: PostgresDatabase,
    readonly sql: string,
    readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): RuntimePreparedStatement {
    return new PostgresPreparedStatement(this.database, this.sql, values);
  }

  private async execute<T extends Record<string, unknown>>(
    queryable: Queryable = this.database.pool,
    previousChanges?: number,
  ): Promise<{ queryResult: QueryResult<T>; duration: number }> {
    const startedAt = performance.now();
    const queryResult = await queryable.query<T>(
      toPostgresSql(this.sql, this.values.length, previousChanges),
      this.values,
    );
    return { queryResult, duration: performance.now() - startedAt };
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const { queryResult } = await this.execute<Record<string, unknown>>();
    const row = queryResult.rows[0];
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<RuntimeQueryResult<T>> {
    const { queryResult, duration } = await this.execute<Record<string, unknown>>();
    return runtimeResult(queryResult, duration) as RuntimeQueryResult<T>;
  }

  async run<T = Record<string, unknown>>(): Promise<RuntimeQueryResult<T>> {
    const { queryResult, duration } = await this.execute<Record<string, unknown>>();
    return runtimeResult(queryResult, duration) as RuntimeQueryResult<T>;
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
    const { queryResult } = await this.execute<Record<string, unknown>>();
    const columns = queryResult.fields.map((field) => field.name);
    const rows = queryResult.rows.map((row) => columns.map((column) => row[column]));
    return (options?.columnNames ? [columns, ...rows] : rows) as T[];
  }

  async executeInTransaction<T extends Record<string, unknown>>(
    client: PoolClient,
    previousChanges: number,
  ): Promise<RuntimeQueryResult<T>> {
    const { queryResult, duration } = await this.execute<T>(client, previousChanges);
    return runtimeResult(queryResult, duration);
  }
}

export class PostgresDatabase implements RuntimeDatabase {
  readonly pool: Pool;

  constructor(connectionString: string) {
    if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
      throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
    }

    this.pool = new Pool({
      connectionString,
      max: Number.parseInt(process.env.PG_POOL_MAX || "10", 10),
      idleTimeoutMillis: Number.parseInt(process.env.PG_IDLE_TIMEOUT_MS || "30000", 10),
      connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECT_TIMEOUT_MS || "5000", 10),
      ssl:
        process.env.PGSSL === "require"
          ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
          : undefined,
    });
  }

  prepare(query: string): RuntimePreparedStatement {
    return new PostgresPreparedStatement(this, query);
  }

  async batch<T = Record<string, unknown>>(
    statements: RuntimePreparedStatement[],
  ): Promise<Array<RuntimeQueryResult<T>>> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const results: Array<RuntimeQueryResult<T>> = [];
      let previousChanges = 0;
      for (const statement of statements) {
        if (!(statement instanceof PostgresPreparedStatement)) {
          throw new Error("PostgreSQL batch received a statement from another runtime provider.");
        }
        results.push(
          (await statement.executeInTransaction<Record<string, unknown>>(
            client,
            previousChanges,
          )) as RuntimeQueryResult<T>,
        );
        previousChanges = Number(results.at(-1)?.meta?.changes || 0);
      }
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    const startedAt = performance.now();
    const result = await this.pool.query(query);
    return {
      count: result.rowCount ?? 0,
      duration: performance.now() - startedAt,
    };
  }
}
