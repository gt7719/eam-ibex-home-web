import assert from "node:assert/strict";
import test from "node:test";
import { validateVpsEnvironment } from "../scripts/vps-env.mjs";

const valid = {
  NODE_ENV: "production",
  IBEX_RUNTIME: "node",
  VINEXT_TRUST_PROXY: "1",
  VINEXT_TRUSTED_HOSTS: "home.ibex.mn",
  DATABASE_URL: "postgresql://ibex:strong-password@postgres:5432/ibex",
  S3_ENDPOINT: "http://minio:9000",
  S3_BUCKET: "ibex-media",
  S3_ACCESS_KEY_ID: "ibex-access",
  S3_SECRET_ACCESS_KEY: "a-long-random-storage-secret",
  HOME_AI_ID_HASH_SALT: "0123456789abcdef0123456789abcdef",
};

test("VPS production environment requires infrastructure and proxy trust", () => {
  assert.deepEqual(validateVpsEnvironment(valid), { bypassed: false });
  assert.throws(
    () => validateVpsEnvironment({ ...valid, DATABASE_URL: "" }),
    /DATABASE_URL/,
  );
  assert.throws(
    () => validateVpsEnvironment({ ...valid, VINEXT_TRUST_PROXY: "0" }),
    /VINEXT_TRUST_PROXY/,
  );
});

test("VPS environment rejects placeholder and partial channel secrets", () => {
  assert.throws(
    () => validateVpsEnvironment({ ...valid, S3_SECRET_ACCESS_KEY: "replace-me" }),
    /placeholder/,
  );
  assert.throws(
    () => validateVpsEnvironment({ ...valid, TURNSTILE_SITE_KEY: "site-only" }),
    /must be configured together/,
  );
});

test("VPS environment enforces isolated OpenAI project keys", () => {
  assert.throws(
    () =>
      validateVpsEnvironment({
        ...valid,
        OPENAI_HOME_API_KEY: "same-key",
        OPENAI_MARKETING_API_KEY: "same-key",
      }),
    /separate OpenAI project keys/,
  );
});

test("unconfigured startup bypass is limited to non-production smoke tests", () => {
  assert.deepEqual(
    validateVpsEnvironment({ IBEX_ALLOW_UNCONFIGURED_STARTUP: "1", NODE_ENV: "test" }),
    { bypassed: true },
  );
  assert.throws(
    () => validateVpsEnvironment({ IBEX_ALLOW_UNCONFIGURED_STARTUP: "1", NODE_ENV: "production" }),
    /DATABASE_URL/,
  );
});
