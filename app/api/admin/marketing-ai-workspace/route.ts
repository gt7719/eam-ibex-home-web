import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import type { CustomerAiDatabase } from "../../../lib/customer-ai";
import { isMarketingAiDomain, marketingAiRecordSnapshot, normalizeMarketingAiKind, validateMarketingAiRecord, type MarketingAiDomain } from "../../../lib/marketing-ai-workspace";
import { getAdminSession, hasMarketingAdminPermission, type MarketingAdminPermission } from "../../../lib/site-admin";
import { readJsonObject } from "../../../lib/http-input";

export const dynamic = "force-dynamic";
type Runtime = { DB: CustomerAiDatabase; MARKETING_EMAIL_OAUTH_TOKEN?: string; MARKETING_SOCIAL_OAUTH_TOKEN?: string };
type RecordRow = { id: string; domain: MarketingAiDomain; kind: string; title: string; status: string; data_json: string; revision: number; owner_id: string; approved_by: string | null; approved_at: string | null; published_at: string | null; archived_at: string | null; created_at: string; updated_at: string };
const RECORD_COLUMNS = "id,domain,kind,title,status,data_json,revision,owner_id,approved_by,approved_at,published_at,archived_at,created_at,updated_at";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function scopeFor(domain: MarketingAiDomain): MarketingAdminPermission {
  if (["leads", "content", "campaigns"].includes(domain)) return "marketing.draft";
  if (["knowledge", "channels", "automation"].includes(domain)) return "marketing.settings";
  return "marketing.audit";
}
async function authorize(permission?: MarketingAdminPermission) {
  const user = await getAdminSession();
  if (!user) return { user: null, error: reply({ error: "Админ нэвтрэлт шаардлагатай." }, 401) };
  if (!hasMarketingAdminPermission(user, permission)) return { user: null, error: reply({ error: "Marketing AI-ийн энэ хэсэгт хандах эрхгүй байна." }, 403) };
  return { user, error: null };
}
function present(row: RecordRow) {
  return marketingAiRecordSnapshot({ id: row.id, domain: row.domain, kind: row.kind, title: row.title, status: row.status, data_json: row.data_json,
    revision: row.revision, ownerId: row.owner_id, approvedBy: row.approved_by, approvedAt: row.approved_at, publishedAt: row.published_at,
    archivedAt: row.archived_at, createdAt: row.created_at, updatedAt: row.updated_at });
}
export async function GET(request: Request) {
  const auth = await authorize(); if (auth.error) return auth.error;
  const runtime = env as unknown as Runtime, url = new URL(request.url), rawDomain = url.searchParams.get("domain"), historyId = url.searchParams.get("history");
  if (historyId) {
    const target = await runtime.DB.prepare("SELECT domain FROM marketing_ai_records WHERE id=? LIMIT 1").bind(historyId.slice(0, 100)).first<{ domain: MarketingAiDomain }>();
    if (!target || !isMarketingAiDomain(target.domain)) return reply({ error: "Record олдсонгүй." }, 404);
    if (!hasMarketingAdminPermission(auth.user!, scopeFor(target.domain))) return reply({ error: "Энэ revision history-г харах эрхгүй байна." }, 403);
    const history = await runtime.DB.prepare("SELECT revision,change_type,snapshot_json,changed_by,note,created_at FROM marketing_ai_revisions WHERE entity_id=? ORDER BY revision DESC LIMIT 50")
      .bind(historyId.slice(0, 100)).all<{ revision: number; change_type: string; snapshot_json: string; changed_by: string; note: string | null; created_at: string }>();
    return reply({ history: (history.results || []).map(row => ({ revision: row.revision, changeType: row.change_type, changedBy: row.changed_by, note: row.note, createdAt: row.created_at })) });
  }
  if (rawDomain && !isMarketingAiDomain(rawDomain)) return reply({ error: "Marketing domain буруу байна." }, 400);
  const domain = rawDomain && isMarketingAiDomain(rawDomain) ? rawDomain : null;
  if (domain && !hasMarketingAdminPermission(auth.user!, scopeFor(domain))) return reply({ error: "Энэ domain-ийг харах эрхгүй байна." }, 403);
  const [records, counts] = await Promise.all([
    domain ? runtime.DB.prepare(`SELECT ${RECORD_COLUMNS} FROM marketing_ai_records WHERE domain=? ORDER BY updated_at DESC LIMIT 100`).bind(domain).all<RecordRow>() : Promise.resolve({ results: [] as RecordRow[] }),
    runtime.DB.prepare("SELECT domain,status,COUNT(*) AS total FROM marketing_ai_records GROUP BY domain,status").all<{ domain: string; status: string; total: number }>(),
  ]);
  const summary: Record<string, Record<string, number>> = {};
  for (const row of counts.results || []) { summary[row.domain] ||= {}; summary[row.domain][row.status] = Number(row.total || 0); }
  return reply({ records: (records.results || []).map(present), summary, safety: { outboundLocked: true, spendLocked: true, humanApprovalRequired: true },
    channelReadiness: { emailCredentialConfigured: Boolean(runtime.MARKETING_EMAIL_OAUTH_TOKEN?.trim()), socialCredentialConfigured: Boolean(runtime.MARKETING_SOCIAL_OAUTH_TOKEN?.trim()) } });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const parsedBody = await readJsonObject(request, 40_000); if (!parsedBody.ok) return reply({ error: parsedBody.error }, parsedBody.status); const body = parsedBody.value;
  if (!isMarketingAiDomain(body.domain)) return reply({ error: "Marketing domain буруу байна." }, 400);
  const domain = body.domain, auth = await authorize(scopeFor(domain)); if (auth.error || !auth.user) return auth.error;
  const normalized = validateMarketingAiRecord(domain, body.title, body.data);
  if (normalized.error) return reply({ error: normalized.error }, 400);
  const kind = normalizeMarketingAiKind(domain, body.kind), now = new Date().toISOString(), id = crypto.randomUUID();
  const snapshot = { id, domain, kind, title: normalized.title, status: "draft", data: normalized.data, revision: 1, ownerId: auth.user.id, approvedBy: null, approvedAt: null, publishedAt: null, archivedAt: null, createdAt: now, updatedAt: now };
  const runtime = env as unknown as Runtime;
  await runtime.DB.batch([
    runtime.DB.prepare("INSERT INTO marketing_ai_records (id,domain,kind,title,status,data_json,revision,owner_id,created_at,updated_at) VALUES (?,?,?,?,'draft',?,1,?,?,?)")
      .bind(id, domain, kind, normalized.title, JSON.stringify(normalized.data), auth.user.id, now, now),
    runtime.DB.prepare("INSERT INTO marketing_ai_revisions (id,entity_type,entity_id,revision,change_type,snapshot_json,changed_by,note,created_at) VALUES (?,'record',?,1,'created',?,?,NULL,?)")
      .bind(crypto.randomUUID(), id, JSON.stringify(snapshot), auth.user.id, now),
    runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) VALUES (?,?, 'marketing_ai.record_created',NULL,'completed',?,?)")
      .bind(crypto.randomUUID(), auth.user.id, JSON.stringify({ recordId: id, domain, kind, revision: 1, outboundExecuted: false }), now),
  ]);
  return reply({ created: snapshot, outboundExecuted: false }, 201);
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const parsedBody = await readJsonObject(request, 40_000); if (!parsedBody.ok) return reply({ error: parsedBody.error }, parsedBody.status); const body = parsedBody.value;
  const id = typeof body.id === "string" ? body.id.slice(0, 100) : "", revision = Number(body.revision), action = typeof body.action === "string" ? body.action : "";
  if (!id || !Number.isSafeInteger(revision) || revision < 1) return reply({ error: "Record болон revision шаардлагатай." }, 400);
  const runtime = env as unknown as Runtime;
  const current = await runtime.DB.prepare(`SELECT ${RECORD_COLUMNS} FROM marketing_ai_records WHERE id=? LIMIT 1`).bind(id).first<RecordRow>();
  if (!current) return reply({ error: "Record олдсонгүй." }, 404);
  const permission = ["approve", "reject", "publish", "archive", "return_to_draft"].includes(action) ? "marketing.approve" : scopeFor(current.domain);
  const auth = await authorize(permission); if (auth.error || !auth.user) return auth.error;
  let nextTitle = current.title, nextData = (() => { try { return JSON.parse(current.data_json) as Record<string, unknown>; } catch { return {}; } })(), nextStatus = current.status;
  if (action === "update") {
    if (!["draft", "rejected"].includes(current.status)) return reply({ error: "Review эсвэл батлагдсан record-ийг шууд засахгүй. Draft төлөвт буцаана уу." }, 409);
    const normalized = validateMarketingAiRecord(current.domain, body.title ?? current.title, body.data ?? nextData);
    if (normalized.error) return reply({ error: normalized.error }, 400);
    nextTitle = normalized.title; nextData = normalized.data;
  } else if (action === "verify") {
    if (current.domain !== "channels" || current.status !== "approved") return reply({ error: "Зөвхөн батлагдсан сувгийн readiness-ийг шалгана." }, 409);
    const credentialReady = current.kind === "website" || current.kind === "email" && Boolean((runtime as Runtime).MARKETING_EMAIL_OAUTH_TOKEN?.trim()) || current.kind === "facebook" && Boolean((runtime as Runtime).MARKETING_SOCIAL_OAUTH_TOKEN?.trim());
    if (!credentialReady) return reply({ error: "Энэ сувгийн server-side OAuth secret одоогоор идэвхгүй байна. Нууц утгыг record-д бүү оруул." }, 409);
    nextData = { ...nextData, readiness: "verified", lastVerifiedAt: new Date().toISOString(), testDeliveryExecuted: false };
  } else if (action === "test") {
    if (current.domain !== "automation" || current.status !== "approved") return reply({ error: "Зөвхөн батлагдсан automation дүрмийг Draft-only тестээр шалгана." }, 409);
    nextData = { ...nextData, lastDraftTestAt: new Date().toISOString(), lastDraftTestStatus: "draft_created", outboundExecuted: false };
  } else {
    const transitions: Record<string, Record<string, string>> = {
      draft: { submit: "review", archive: "archived" }, rejected: { submit: "review", archive: "archived" }, review: { approve: "approved", reject: "rejected" },
      approved: { publish: current.domain === "knowledge" ? "published" : "approved", archive: "archived", return_to_draft: "draft" },
      published: { archive: "archived" }, archived: { return_to_draft: "draft" },
    };
    const target = transitions[current.status]?.[action];
    if (!target) return reply({ error: `Энэ төлөвөөс ${action} хийх боломжгүй.` }, 409);
    if (action === "publish" && current.domain !== "knowledge") return reply({ error: "Гадагш нийтлэх ажиллагаа хаалттай. Батлагдсан record нь зөвхөн дотоод хэрэглээнд байна." }, 409);
    nextStatus = target;
  }
  const nextRevision = revision + 1, now = new Date().toISOString(), note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const approved = nextStatus === "approved" || nextStatus === "published", published = nextStatus === "published", archived = nextStatus === "archived";
  const snapshot = { id, domain: current.domain, kind: current.kind, title: nextTitle, status: nextStatus, data: nextData, revision: nextRevision,
    ownerId: current.owner_id, approvedBy: approved ? auth.user.id : null, approvedAt: approved ? now : null, publishedAt: published ? now : null,
    archivedAt: archived ? now : null, createdAt: current.created_at, updatedAt: now };
  let testDraftId: string | null = null;
  const statements = [
    runtime.DB.prepare("UPDATE marketing_ai_records SET title=?,status=?,data_json=?,revision=revision+1,approved_by=?,approved_at=?,published_at=?,archived_at=?,updated_at=? WHERE id=? AND revision=?")
      .bind(nextTitle, nextStatus, JSON.stringify(nextData), snapshot.approvedBy, snapshot.approvedAt, snapshot.publishedAt, snapshot.archivedAt, now, id, revision),
    runtime.DB.prepare("INSERT INTO marketing_ai_revisions (id,entity_type,entity_id,revision,change_type,snapshot_json,changed_by,note,created_at) SELECT ?,'record',?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM marketing_ai_records WHERE id=? AND revision=? AND updated_at=?)")
      .bind(crypto.randomUUID(), id, nextRevision, action, JSON.stringify(snapshot), auth.user.id, note || null, now, id, nextRevision, now),
    runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) SELECT ?,?,'marketing_ai.record_changed',NULL,?,?,? WHERE EXISTS (SELECT 1 FROM marketing_ai_records WHERE id=? AND revision=? AND updated_at=?)")
      .bind(crypto.randomUUID(), auth.user.id, nextStatus, JSON.stringify({ recordId: id, domain: current.domain, action, from: current.status, to: nextStatus, revision: nextRevision, outboundExecuted: false, spendExecuted: false }), now, id, nextRevision, now),
  ];
  if (action === "test" && current.domain === "automation") {
    testDraftId = crypto.randomUUID();
    const draftTitle = `Automation test · ${current.title}`.slice(0, 160), draftContent = String(nextData.draftAction || nextData.action || "Draft-only automation test").slice(0, 12_000);
    statements.push(
      runtime.DB.prepare("INSERT INTO marketing_ai_drafts (id,admin_id,title,task_type,prompt_profile,prompt_version,model,content,missing_inputs_json,status,revision,estimated_cost_usd,created_at,updated_at) SELECT ?,?,?,'general','general','marketing-admin-v2','local',?,'[]','draft',1,0,?,? WHERE EXISTS (SELECT 1 FROM marketing_ai_records WHERE id=? AND revision=? AND updated_at=?)")
        .bind(testDraftId, auth.user.id, draftTitle, draftContent, now, now, id, nextRevision, now),
      runtime.DB.prepare("INSERT INTO marketing_ai_revisions (id,entity_type,entity_id,revision,change_type,snapshot_json,changed_by,note,created_at) SELECT ?,'draft',?,1,'automation_test',?,?,NULL,? WHERE EXISTS (SELECT 1 FROM marketing_ai_drafts WHERE id=?)")
        .bind(crypto.randomUUID(), testDraftId, JSON.stringify({ title: draftTitle, content: draftContent, status: "draft", sourceAutomationId: current.id, revision: 1 }), auth.user.id, now, testDraftId),
      runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) SELECT ?,?,'marketing_ai.automation_test','local','draft_created',?,? WHERE EXISTS (SELECT 1 FROM marketing_ai_drafts WHERE id=?)")
        .bind(crypto.randomUUID(), auth.user.id, JSON.stringify({ recordId: current.id, draftId: testDraftId, outboundExecuted: false, spendExecuted: false }), now, testDraftId),
    );
  }
  try {
    const results = await runtime.DB.batch(statements);
    if (Number(results[0]?.meta?.changes || 0) !== 1) {
      return reply({ error: "Record өөр админаар шинэчлэгдсэн байна. Дахин ачаална уу." }, 409);
    }
  } catch (error) {
    console.error("marketing_ai_record_atomic_write_failed", error);
    return reply({ error: "Record, revision болон audit-ийг хамтад нь хадгалж чадсангүй." }, 503);
  }
  return reply({ updated: snapshot, testDraftId, outboundExecuted: false, spendExecuted: false });
}
