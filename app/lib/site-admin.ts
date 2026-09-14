import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "ibex_site_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const ADMIN_PERMISSIONS = [
  "navigation.manage",
  "pricing.manage",
  "partners.manage",
  "people.manage",
  "knowledge.manage",
  "marketing.manage",
  "social.manage",
  "accounts.manage",
  "media.upload",
] as const;
export const ADMIN_CONTENT_PERMISSIONS = [
  "navigation.manage",
  "pricing.manage",
  "partners.manage",
  "people.manage",
  "knowledge.manage",
  "marketing.manage",
  "social.manage",
  "accounts.manage",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
// Keep the work factor within the Cloudflare Worker request CPU budget. The
// setup and login endpoints are additionally protected by the site access
// policy and use a unique 128-bit salt for every administrator.
export const PASSWORD_HASH_ITERATIONS = 100_000;

type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "editor";
  permissions_json?: string | null;
  status: "active" | "suspended";
  last_access: string | null;
  password_hash?: string;
  password_salt?: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_HASH_ITERATIONS },
    material,
    256,
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export async function createInitialAdminWithSession(input: {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  now: string;
}) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE * 1000).toISOString();

  // D1 batch operations are atomic. An administrator can no longer be created
  // without the matching first session (or vice versa).
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(input.now),
    env.DB.prepare(
      `INSERT INTO admin_users
       (id, email, name, password_hash, password_salt, role, status, last_access, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'owner', 'active', ?, ?, ?)`,
    ).bind(
      input.userId,
      input.email,
      input.name,
      input.passwordHash,
      input.passwordSalt,
      input.now,
      input.now,
      input.now,
    ),
    env.DB.prepare(
      "INSERT INTO admin_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), input.userId, tokenHash, expiresAt, input.now),
  ]);

  return token;
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  if (hash.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < hash.length; index += 1) {
    difference |= hash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return difference === 0;
}

export function safeAdmin(row: AdminRow) {
  let permissions: AdminPermission[] = [];
  if (row.role === "owner") {
    permissions = [...ADMIN_PERMISSIONS];
  } else if (row.permissions_json == null) {
    permissions = [...ADMIN_PERMISSIONS];
  } else {
    try {
      permissions = normalizeAdminPermissions(JSON.parse(row.permissions_json));
    } catch {
      permissions = [];
    }
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    permissions,
    status: row.status,
    lastAccess: row.last_access,
    canManageAdmins: row.role === "owner",
  };
}

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === "string" && (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isAdminPermission))];
}

export function hasAdminPermission(
  user: { role: "owner" | "editor"; permissions: AdminPermission[] },
  permission: AdminPermission,
) {
  return user.role === "owner" || user.permissions.includes(permission);
}

export async function countAdmins() {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM admin_users").first<{ total: number }>();
  return Number(row?.total || 0);
}

export function authenticatedSiteIdentity(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || "";
  const encodedName = request.headers.get("oai-authenticated-user-full-name") || "";
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  let name = email;
  if (encodedName && encoding === "percent-encoded-utf-8") {
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      name = email;
    }
  }
  return email ? { email, name: name || email } : null;
}

export async function createAdminSession(userId: string) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(createdAt),
    env.DB.prepare(
      "INSERT INTO admin_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt, createdAt),
    env.DB.prepare("UPDATE admin_users SET last_access = ?, updated_at = ? WHERE id = ?").bind(
      createdAt,
      createdAt,
      userId,
    ),
  ]);
  return token;
}

export async function deleteAdminSession(token: string | undefined) {
  if (!token) return;
  await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.permissions_json, u.status, u.last_access
     FROM admin_sessions s
     INNER JOIN admin_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'
     LIMIT 1`,
  )
    .bind(await sha256(token), now)
    .first<AdminRow>();
  return row ? safeAdmin(row) : null;
}

export async function findAdminByEmail(email: string) {
  return env.DB.prepare(
    `SELECT id, email, name, role, permissions_json, status, last_access, password_hash, password_salt
     FROM admin_users WHERE email = ? LIMIT 1`,
  )
    .bind(email.trim().toLowerCase())
    .first<AdminRow>();
}

export function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}
