interface D1ResultMeta {
  changes?: number;
  duration?: number;
  last_row_id?: number | string;
}

interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
  error?: string;
  meta?: D1ResultMeta;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<Array<D1Result<T>>>;
  exec(query: string): Promise<D1ExecResult>;
}

interface R2HTTPMetadata {
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentType?: string;
}

interface R2PutOptions {
  customMetadata?: Record<string, string>;
  httpMetadata?: R2HTTPMetadata;
}

interface R2ObjectBody {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  delete(keys: string | string[]): Promise<void>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob | string | null,
    options?: R2PutOptions,
  ): Promise<unknown>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
  }
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
