import { pathToFileURL } from "node:url";

const placeholders = ["replace-me", "changeme", "example", "your-"];

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Missing required VPS environment variable: ${name}`);
  if (placeholders.some((placeholder) => value.toLowerCase().includes(placeholder))) {
    throw new Error(`VPS environment variable still contains a placeholder: ${name}`);
  }
  return value;
}

function paired(environment, first, second) {
  const firstSet = Boolean(environment[first]?.trim());
  const secondSet = Boolean(environment[second]?.trim());
  if (firstSet !== secondSet) {
    throw new Error(`${first} and ${second} must be configured together.`);
  }
}

export function validateVpsEnvironment(environment = process.env) {
  if (
    environment.IBEX_ALLOW_UNCONFIGURED_STARTUP === "1" &&
    environment.NODE_ENV !== "production"
  ) {
    return { bypassed: true };
  }

  const databaseUrl = required(environment, "DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://.");
  }

  const s3Endpoint = required(environment, "S3_ENDPOINT");
  const endpoint = new URL(s3Endpoint);
  if (!["http:", "https:"].includes(endpoint.protocol)) {
    throw new Error("S3_ENDPOINT must use http:// or https://.");
  }
  required(environment, "S3_BUCKET");
  required(environment, "S3_ACCESS_KEY_ID");
  required(environment, "S3_SECRET_ACCESS_KEY");

  const identitySalt = required(environment, "HOME_AI_ID_HASH_SALT");
  if (identitySalt.length < 32) {
    throw new Error("HOME_AI_ID_HASH_SALT must contain at least 32 characters.");
  }

  paired(environment, "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY");
  paired(environment, "SMS_PROVIDER_URL", "SMS_PROVIDER_TOKEN");
  if (environment.RESEND_API_KEY?.trim() && !environment.EMAIL_FROM?.trim()) {
    throw new Error("EMAIL_FROM is required when RESEND_API_KEY is configured.");
  }

  const openAiKeys = [
    environment.OPENAI_HOME_API_KEY?.trim(),
    environment.OPENAI_MARKETING_API_KEY?.trim(),
    environment.OPENAI_INTELLIGENT_API_KEY?.trim(),
  ].filter(Boolean);
  if (new Set(openAiKeys).size !== openAiKeys.length) {
    throw new Error("Home, Marketing and Intelligent AI must use separate OpenAI project keys.");
  }

  if (environment.NODE_ENV === "production") {
    if (environment.IBEX_RUNTIME !== "node") {
      throw new Error("Production VPS requires IBEX_RUNTIME=node.");
    }
    if (environment.VINEXT_TRUST_PROXY !== "1") {
      throw new Error("Production VPS behind Nginx requires VINEXT_TRUST_PROXY=1.");
    }
    required(environment, "VINEXT_TRUSTED_HOSTS");
  }

  return { bypassed: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateVpsEnvironment();
  console.log("VPS environment validation passed.");
}
