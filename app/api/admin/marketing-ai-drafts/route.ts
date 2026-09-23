import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getAdminSession, hasMarketingAdminPermission } from "../../../lib/site-admin";
import type { CustomerAiDatabase } from "../../../lib/customer-ai";

export const dynamic = "force-dynamic";
type Runtime = { DB: CustomerAiDatabase };
type DraftRow = { id: string; admin_id: string; title: string; task_type: string; prompt_profile: string; prompt_version: string; model: string; content: string; missing_inputs_json: string; status: string; revision: number; estimated_cost_usd: number; submitted_at: string | null; decided_by: string | null; decided_at: string | null; decision_note: string | null; created_at: string; updated_at: string };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function authorize() {
  const user = await getAdminSession();
  if (!user) return { user: null, error: reply({ error: "Админ нэвтрэлт шаардлагатай." }, 401) };
  if (!hasMarketingAdminPermission(user)) return { user: null, error: reply({ error: "Marketing AI Draft удирдах эрхгүй байна." }, 403) };
  return { user, error: null };
}
function present(row: DraftRow) {
  let missingInputs: string[] = []; try { missingInputs = JSON.parse(row.missing_inputs_json); } catch {}
  return { id: row.id, adminId: row.admin_id, title: row.title, taskType: row.task_type, promptProfile: row.prompt_profile, promptVersion: row.prompt_version, model: row.model,
    content: row.content, missingInputs, status: row.status, revision: row.revision, estimatedCostUsd: row.estimated_cost_usd, submittedAt: row.submitted_at,
    decidedBy: row.decided_by, decidedAt: row.decided_at, decisionNote: row.decision_note, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function GET() {
  const auth = await authorize(); if (auth.error) return auth.error;
  const runtime = env as unknown as Runtime;
  const result = await runtime.DB.prepare("SELECT id,admin_id,title,task_type,prompt_profile,prompt_version,model,content,missing_inputs_json,status,revision,estimated_cost_usd,submitted_at,decided_by,decided_at,decision_note,created_at,updated_at FROM marketing_ai_drafts ORDER BY updated_at DESC LIMIT 60").all<DraftRow>();
  return reply({ drafts: (result.results || []).map(present), outboundEnabled: false });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const auth = await authorize(); if (auth.error || !auth.user) return auth.error;
  const body = await request.json().catch(() => null) as { id?: string; revision?: number; action?: "submit" | "approve" | "reject" | "return_to_draft"; note?: string } | null;
  if (!body?.id || !Number.isInteger(body.revision) || !body.action) return reply({ error: "Draft, revision эсвэл шийдвэр дутуу байна." }, 400);
  if (body.action === "submit" && !hasMarketingAdminPermission(auth.user, "marketing.draft")) return reply({ error: "Draft-ийг Review-д илгээх эрхгүй байна." }, 403);
  if (body.action !== "submit" && !hasMarketingAdminPermission(auth.user, "marketing.approve")) return reply({ error: "Draft батлах эсвэл татгалзах эрхгүй байна." }, 403);
  const runtime = env as unknown as Runtime;
  const current = await runtime.DB.prepare("SELECT id,admin_id,title,task_type,prompt_profile,prompt_version,model,content,missing_inputs_json,status,revision,estimated_cost_usd,submitted_at,decided_by,decided_at,decision_note,created_at,updated_at FROM marketing_ai_drafts WHERE id=? LIMIT 1").bind(body.id).first<DraftRow>();
  if (!current) return reply({ error: "Draft олдсонгүй." }, 404);
  const allowed: Record<string, string[]> = { draft: ["submit"], review: ["approve", "reject", "return_to_draft"], rejected: ["return_to_draft"], approved: ["return_to_draft"] };
  if (!(allowed[current.status] || []).includes(body.action)) return reply({ error: `Энэ төлөвөөс ${body.action} шийдвэр хийх боломжгүй.` }, 409);
  const nextStatus = body.action === "submit" ? "review" : body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "draft";
  const now = new Date().toISOString(), note = typeof body.note === "string" ? body.note.trim().slice(0, 1_000) : "";
  const result = await runtime.DB.prepare("UPDATE marketing_ai_drafts SET status=?,revision=revision+1,submitted_at=CASE WHEN ?='review' THEN ? ELSE submitted_at END,decided_by=CASE WHEN ? IN ('approved','rejected') THEN ? ELSE NULL END,decided_at=CASE WHEN ? IN ('approved','rejected') THEN ? ELSE NULL END,decision_note=?,updated_at=? WHERE id=? AND revision=?")
    .bind(nextStatus, nextStatus, now, nextStatus, auth.user.id, nextStatus, now, note || null, now, body.id, body.revision).run();
  if (result.meta?.changes !== undefined && Number(result.meta.changes) !== 1) return reply({ error: "Draft өөр админаар шинэчлэгдсэн байна. Дахин ачаална уу." }, 409);
  await runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), auth.user.id, "marketing_ai.approval_decision", current.model, nextStatus, JSON.stringify({ draftId: current.id, from: current.status, to: nextStatus, revision: Number(body.revision) + 1, outboundExecuted: false }), now).run();
  const updated = await runtime.DB.prepare("SELECT id,admin_id,title,task_type,prompt_profile,prompt_version,model,content,missing_inputs_json,status,revision,estimated_cost_usd,submitted_at,decided_by,decided_at,decision_note,created_at,updated_at FROM marketing_ai_drafts WHERE id=? LIMIT 1").bind(body.id).first<DraftRow>();
  return reply({ updated: updated ? present(updated) : null, outboundExecuted: false });
}
