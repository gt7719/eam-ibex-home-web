import { env } from "cloudflare:workers";

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function loginAttemptKey(request: Request, email: string) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return digest(`${email.toLowerCase()}|${ip}`);
}

export async function loginIsLocked(key: string) {
  const row = await env.DB.prepare("SELECT locked_until FROM admin_login_attempts WHERE attempt_key = ? LIMIT 1")
    .bind(key)
    .first<{ locked_until: string | null }>();
  return Boolean(row?.locked_until && row.locked_until > new Date().toISOString());
}

export async function recordLoginFailure(key: string) {
  const now = new Date();
  const row = await env.DB.prepare("SELECT attempt_count, first_attempt_at FROM admin_login_attempts WHERE attempt_key = ? LIMIT 1")
    .bind(key)
    .first<{ attempt_count: number; first_attempt_at: string }>();
  const withinWindow = row && now.getTime() - new Date(row.first_attempt_at).getTime() < 15 * 60 * 1000;
  const count = withinWindow ? Number(row.attempt_count) + 1 : 1;
  const firstAttempt = withinWindow ? row.first_attempt_at : now.toISOString();
  const lockedUntil = count >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
  await env.DB.prepare(
    `INSERT INTO admin_login_attempts (attempt_key,attempt_count,first_attempt_at,locked_until,updated_at)
     VALUES (?,?,?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET attempt_count=excluded.attempt_count,
     first_attempt_at=excluded.first_attempt_at,locked_until=excluded.locked_until,updated_at=excluded.updated_at`,
  ).bind(key, count, firstAttempt, lockedUntil, now.toISOString()).run();
  return { locked: Boolean(lockedUntil) };
}

export async function clearLoginFailures(key: string) {
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE attempt_key = ?").bind(key).run();
}

export function conflictMessage() {
  return "Өөр админ энэ мэдээллийг шинэчилсэн байна. Хуудсыг дахин ачаалж хянана уу. / Another administrator updated this content. Reload and review it.";
}

export async function readContentRevision(key: string) {
  const row = await env.DB.prepare("SELECT updated_at FROM site_content WHERE key = ? LIMIT 1")
    .bind(key)
    .first<{ updated_at: string }>();
  return row?.updated_at || null;
}

export async function saveContentWithRevision(input: {
  key: string;
  value: unknown;
  userId: string;
  expectedRevision: string | null;
}) {
  const currentRevision = await readContentRevision(input.key);
  if (currentRevision !== input.expectedRevision) return null;
  const now = new Date().toISOString();
  const valueJson = JSON.stringify(input.value);
  const result = currentRevision === null
    ? await env.DB.prepare(
        "INSERT INTO site_content (key,value_json,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO NOTHING",
      ).bind(input.key, valueJson, input.userId, now).run()
    : await env.DB.prepare(
        "UPDATE site_content SET value_json=?,updated_by=?,updated_at=? WHERE key=? AND updated_at=?",
      ).bind(valueJson, input.userId, now, input.key, currentRevision).run();
  const changes = result.meta?.changes;
  return changes === undefined ? (result.success === false ? null : now) : Number(changes) === 1 ? now : null;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function safeHttpsUrl(value: unknown, allowEmpty = true) {
  const raw = cleanText(value, 2000);
  if (!raw) return allowEmpty ? "" : null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function safeMediaUrl(value: unknown) {
  const raw = cleanText(value, 2000);
  if (!raw) return "";
  if (/^\/api\/media\/[a-zA-Z0-9-]{1,100}$/.test(raw)) return raw;
  if (/^(?:\.\/)?[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif)$/i.test(raw) && !raw.includes("..")) return raw;
  return safeHttpsUrl(raw) || "";
}

function uniqueId(value: unknown, prefix: string, index: number, seen: Set<string>) {
  let candidate = cleanText(value, 80);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(candidate) || seen.has(candidate)) candidate = `${prefix}-${index + 1}`;
  while (seen.has(candidate)) candidate = `${prefix}-${index + 1}-${seen.size + 1}`;
  seen.add(candidate);
  return candidate;
}

export function normalizePartners(value: unknown) {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  return value.slice(0, 100).map((entry, index) => {
    const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const url = safeHttpsUrl(row.url);
    if (row.url && url === null) throw new Error("Хамтрагч байгууллагын холбоос HTTPS байх ёстой.");
    return {
      id: uniqueId(row.id, "partner", index, seen),
      name: cleanText(row.name, 160),
      typeMn: cleanText(row.typeMn, 160),
      typeEn: cleanText(row.typeEn, 160),
      descriptionMn: cleanText(row.descriptionMn, 5000),
      descriptionEn: cleanText(row.descriptionEn, 5000),
      logo: safeMediaUrl(row.logo),
      logoAltMn: cleanText(row.logoAltMn, 300),
      logoAltEn: cleanText(row.logoAltEn, 300),
      url: url || "",
      enabled: row.enabled !== false,
    };
  });
}

export function normalizePeople(value: unknown) {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  return value.slice(0, 100).map((entry, index) => {
    const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    return {
      id: uniqueId(row.id, "person", index, seen),
      nameMn: cleanText(row.nameMn, 160),
      nameEn: cleanText(row.nameEn, 160),
      roleMn: cleanText(row.roleMn, 240),
      roleEn: cleanText(row.roleEn, 240),
      organizationMn: cleanText(row.organizationMn, 240),
      organizationEn: cleanText(row.organizationEn, 240),
      descriptionMn: cleanText(row.descriptionMn, 5000),
      descriptionEn: cleanText(row.descriptionEn, 5000),
      photo: safeMediaUrl(row.photo),
      photoAltMn: cleanText(row.photoAltMn, 300),
      photoAltEn: cleanText(row.photoAltEn, 300),
      enabled: row.enabled !== false,
    };
  });
}
