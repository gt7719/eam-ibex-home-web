import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after } from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = new URL("..", import.meta.url).pathname;
const temporaryDirectory = await mkdtemp(join(root, ".s3-runtime-test-"));
const compiledPath = join(temporaryDirectory, "s3-storage.mjs");
const source = await readFile(join(root, "app/runtime/s3-storage.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
await writeFile(compiledPath, compiled);
const { readS3StorageConfig } = await import(
  `${pathToFileURL(compiledPath).href}?test=${Date.now()}`
);

after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

test("S3 storage remains disabled when no configuration is supplied", () => {
  assert.equal(readS3StorageConfig({}), null);
});

test("S3 storage rejects partial or invalid configuration", () => {
  assert.throws(
    () => readS3StorageConfig({ S3_ENDPOINT: "http://minio:9000" }),
    /must be configured together/,
  );
  assert.throws(
    () =>
      readS3StorageConfig({
        S3_ENDPOINT: "file:///tmp/storage",
        S3_BUCKET: "ibex-media",
        S3_ACCESS_KEY_ID: "access",
        S3_SECRET_ACCESS_KEY: "secret",
      }),
    /must use http:\/\/ or https:\/\//,
  );
});

test("S3 storage accepts an explicit MinIO configuration", () => {
  assert.deepEqual(
    readS3StorageConfig({
      S3_ENDPOINT: "http://minio:9000/",
      S3_BUCKET: "ibex-media",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_FORCE_PATH_STYLE: "true",
    }),
    {
      endpoint: "http://minio:9000",
      region: "us-east-1",
      bucket: "ibex-media",
      accessKeyId: "access",
      secretAccessKey: "secret",
      forcePathStyle: true,
    },
  );
});
