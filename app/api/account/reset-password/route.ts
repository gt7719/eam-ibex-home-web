import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { digest, newPasswordCredential, validateSitePassword } from "../../../lib/site-user-auth";
import { readJsonObject } from "../../../lib/http-input";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const parsedBody = await readJsonObject<{ token?: string; password?: string; passwordConfirm?: string }>(request, 8_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.value;
  const password = typeof body.password === "string" ? body.password : "";
  if (!body.token || !/^[a-f0-9]{64}$/.test(body.token)) return NextResponse.json({ error: "Сэргээх холбоос буруу байна." }, { status: 400 });
  const passwordErrors = validateSitePassword(password);
  if (password !== body.passwordConfirm) passwordErrors.push("Нууц үгийн давталт тохирохгүй байна.");
  if (passwordErrors.length) return NextResponse.json({ error: passwordErrors.join(" ") }, { status: 400 });
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    "SELECT id,user_id,status,expires_at FROM site_user_tokens WHERE token_hash=? AND purpose='password_reset' LIMIT 1",
  ).bind(await digest(body.token)).first<{ id: string; user_id: string; status: string; expires_at: string }>();
  if (!row || row.status !== "pending") return NextResponse.json({ error: "Сэргээх холбоос хүчингүй болсон байна." }, { status: 400 });
  if (row.expires_at <= now) {
    await env.DB.prepare("UPDATE site_user_tokens SET status='expired' WHERE id=?").bind(row.id).run();
    return NextResponse.json({ error: "Сэргээх холбоосын хугацаа дууссан байна." }, { status: 410 });
  }
  const credential = await newPasswordCredential(password);
  await env.DB.batch([
    env.DB.prepare("UPDATE site_users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?").bind(credential.hash, credential.salt, now, row.user_id),
    env.DB.prepare("UPDATE site_user_tokens SET status='used',used_at=? WHERE id=? AND status='pending'").bind(now, row.id),
    env.DB.prepare("UPDATE site_user_tokens SET status='invalidated' WHERE user_id=? AND purpose='password_reset' AND id!=? AND status='pending'").bind(row.user_id, row.id),
    env.DB.prepare("UPDATE site_user_sessions SET status='password_changed',revoked_at=? WHERE user_id=? AND status='active'").bind(now, row.user_id),
  ]);
  return NextResponse.json({ reset: true });
}
