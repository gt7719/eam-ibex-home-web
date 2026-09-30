export interface RuntimeResultMeta {
  changes?: number;
  duration?: number;
  last_row_id?: number | string;
}

export interface RuntimeQueryResult<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
  error?: string;
  meta?: RuntimeResultMeta;
}

export interface RuntimePreparedStatement {
  bind(...values: unknown[]): RuntimePreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<RuntimeQueryResult<T>>;
  run<T = Record<string, unknown>>(): Promise<RuntimeQueryResult<T>>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
}

export interface RuntimeDatabase {
  prepare(query: string): RuntimePreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: RuntimePreparedStatement[],
  ): Promise<Array<RuntimeQueryResult<T>>>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface RuntimeObjectHttpMetadata {
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentType?: string;
}

export interface RuntimeObjectBody {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

export interface RuntimeObjectStorage {
  delete(keys: string | string[]): Promise<void>;
  get(key: string): Promise<RuntimeObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob | string | null,
    options?: {
      customMetadata?: Record<string, string>;
      httpMetadata?: RuntimeObjectHttpMetadata;
    },
  ): Promise<unknown>;
}

export interface RuntimeEnv {
  DB: RuntimeDatabase;
  BUCKET: RuntimeObjectStorage;
}
