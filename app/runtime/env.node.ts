import type {
  RuntimeDatabase,
  RuntimeEnv,
  RuntimeObjectStorage,
} from "./contracts";
import { PostgresDatabase } from "./postgres";
import { readS3StorageConfig, S3ObjectStorage } from "./s3-storage";

export class RuntimeServiceUnavailableError extends Error {
  constructor(service: "database" | "object-storage") {
    super(
      `VPS ${service} adapter is not configured. Complete the PostgreSQL and MinIO migration before enabling production traffic.`,
    );
    this.name = "RuntimeServiceUnavailableError";
  }
}

function unavailableDatabase(): RuntimeDatabase {
  const fail = (): never => {
    throw new RuntimeServiceUnavailableError("database");
  };

  return {
    prepare: fail,
    batch: async () => fail(),
    exec: async () => fail(),
  };
}

function unavailableObjectStorage(): RuntimeObjectStorage {
  const fail = (): never => {
    throw new RuntimeServiceUnavailableError("object-storage");
  };

  return {
    delete: async () => fail(),
    get: async () => fail(),
    put: async () => fail(),
  };
}

/**
 * Fail-closed Node provider used until R2/R3 attach PostgreSQL and MinIO.
 * It intentionally allows the standalone server to build and boot while
 * refusing every persistence operation instead of falling back to memory.
 */
const s3Config = readS3StorageConfig();

export const env = {
  ...process.env,
  DB: process.env.DATABASE_URL
    ? new PostgresDatabase(process.env.DATABASE_URL)
    : unavailableDatabase(),
  BUCKET: s3Config ? new S3ObjectStorage(s3Config) : unavailableObjectStorage(),
} as unknown as RuntimeEnv;
