import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing migration environment variable: ${name}`);
  return value;
}

function client(prefix) {
  return new S3Client({
    endpoint: required(`${prefix}_ENDPOINT`),
    region: process.env[`${prefix}_REGION`]?.trim() || "auto",
    forcePathStyle: process.env[`${prefix}_FORCE_PATH_STYLE`] !== "false",
    credentials: {
      accessKeyId: required(`${prefix}_ACCESS_KEY_ID`),
      secretAccessKey: required(`${prefix}_SECRET_ACCESS_KEY`),
    },
  });
}

const source = client("R2_SOURCE");
const target = client("S3_TARGET");
const sourceBucket = required("R2_SOURCE_BUCKET");
const targetBucket = required("S3_TARGET_BUCKET");
const reportPath = resolve(process.env.MIGRATION_REPORT || "migration-report-r2-s3.json");
const report = { startedAt: new Date().toISOString(), objects: [], totalBytes: 0 };

let continuationToken;
do {
  const page = await source.send(
    new ListObjectsV2Command({
      Bucket: sourceBucket,
      ContinuationToken: continuationToken,
    }),
  );
  for (const listed of page.Contents || []) {
    if (!listed.Key) continue;
    const object = await source.send(
      new GetObjectCommand({ Bucket: sourceBucket, Key: listed.Key }),
    );
    if (!object.Body) throw new Error(`R2 object has no body: ${listed.Key}`);
    await target.send(
      new PutObjectCommand({
        Bucket: targetBucket,
        Key: listed.Key,
        Body: object.Body,
        CacheControl: object.CacheControl,
        ContentDisposition: object.ContentDisposition,
        ContentEncoding: object.ContentEncoding,
        ContentLanguage: object.ContentLanguage,
        ContentType: object.ContentType,
        Metadata: object.Metadata,
      }),
    );
    const targetObject = await target.send(
      new HeadObjectCommand({ Bucket: targetBucket, Key: listed.Key }),
    );
    const sourceSize = Number(object.ContentLength ?? listed.Size ?? 0);
    const targetSize = Number(targetObject.ContentLength ?? -1);
    if (sourceSize !== targetSize) {
      throw new Error(`Object size reconciliation failed for ${listed.Key}: source=${sourceSize}, target=${targetSize}`);
    }
    report.objects.push({ key: listed.Key, sourceBytes: sourceSize, targetBytes: targetSize });
    report.totalBytes += sourceSize;
  }
  continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (continuationToken);

report.completedAt = new Date().toISOString();
report.status = "completed";
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(`R2 migration completed: ${report.objects.length} objects, ${report.totalBytes} bytes. Report: ${reportPath}`);
