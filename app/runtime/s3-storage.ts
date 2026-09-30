import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type {
  RuntimeObjectBody,
  RuntimeObjectStorage,
} from "./contracts";

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export function readS3StorageConfig(
  environment: NodeJS.ProcessEnv = process.env,
): S3StorageConfig | null {
  const endpoint = environment.S3_ENDPOINT?.trim();
  const bucket = environment.S3_BUCKET?.trim();
  const accessKeyId = environment.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = environment.S3_SECRET_ACCESS_KEY?.trim();
  const supplied = [endpoint, bucket, accessKeyId, secretAccessKey].filter(Boolean).length;
  if (supplied === 0) return null;
  if (supplied !== 4) {
    throw new Error(
      "S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together.",
    );
  }
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 configuration validation failed.");
  }

  const endpointUrl = new URL(endpoint);
  if (!["http:", "https:"].includes(endpointUrl.protocol)) {
    throw new Error("S3_ENDPOINT must use http:// or https://.");
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error("S3_BUCKET is not a valid S3-compatible bucket name.");
  }

  return {
    endpoint: endpointUrl.toString().replace(/\/$/, ""),
    region: environment.S3_REGION?.trim() || "us-east-1",
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: environment.S3_FORCE_PATH_STYLE !== "false",
  };
}

function putBody(
  value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob | string | null,
): PutObjectCommandInput["Body"] {
  if (value === null || typeof value === "string") return value ?? "";
  if (value instanceof Blob) {
    return Readable.fromWeb(value.stream() as unknown as NodeReadableStream);
  }
  if (value instanceof ReadableStream) {
    return Readable.fromWeb(value as unknown as NodeReadableStream);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(value);
}

export class S3ObjectStorage implements RuntimeObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async delete(keys: string | string[]): Promise<void> {
    const keyList = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
    if (keyList.length === 0) return;
    if (keyList.length === 1) {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.config.bucket, Key: keyList[0] }),
      );
      return;
    }
    for (let index = 0; index < keyList.length; index += 1_000) {
      const batch = keyList.slice(index, index + 1_000);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.config.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }

  async get(key: string): Promise<RuntimeObjectBody | null> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      if (!object.Body) return null;
      const body = object.Body.transformToWebStream();
      return {
        body,
        httpEtag: object.ETag || "",
        writeHttpMetadata(headers) {
          if (object.CacheControl) headers.set("Cache-Control", object.CacheControl);
          if (object.ContentDisposition) headers.set("Content-Disposition", object.ContentDisposition);
          if (object.ContentEncoding) headers.set("Content-Encoding", object.ContentEncoding);
          if (object.ContentLanguage) headers.set("Content-Language", object.ContentLanguage);
          if (object.ContentType) headers.set("Content-Type", object.ContentType);
          if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength));
        },
      };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      const name = (error as { name?: string }).name;
      if (status === 404 || name === "NoSuchKey" || name === "NotFound") return null;
      throw error;
    }
  }

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | Blob | string | null,
    options?: {
      customMetadata?: Record<string, string>;
      httpMetadata?: {
        cacheControl?: string;
        contentDisposition?: string;
        contentEncoding?: string;
        contentLanguage?: string;
        contentType?: string;
      };
    },
  ): Promise<unknown> {
    return this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: putBody(value),
        Metadata: options?.customMetadata,
        CacheControl: options?.httpMetadata?.cacheControl,
        ContentDisposition: options?.httpMetadata?.contentDisposition,
        ContentEncoding: options?.httpMetadata?.contentEncoding,
        ContentLanguage: options?.httpMetadata?.contentLanguage,
        ContentType: options?.httpMetadata?.contentType,
      }),
    );
  }
}
