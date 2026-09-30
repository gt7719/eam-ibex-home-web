import { env } from "@/app/runtime/env";
import { features, normalizeConfig } from "../../public/package-model.mjs";
import { readPackageState, type PackageConfig } from "./packages";
import { offerDate, publicLaunchOffer, type PlanOffer } from "./launch-offer-model";
import { readLaunchOffer } from "./launch-offer";

export type SubscriptionRow = Record<string, string | number | null>;
type PackageTier = PackageConfig["tiers"][number];
export type ProvisioningPayload = {
  schemaVersion: 1;
  requestId: string;
  source: "ibex-home-web";
  organization: { name: string };
  tenantAdmin: { homeWebUserId: string; fullName: string; email: string };
  entitlement: {
    subscriptionId: string; planId: string; planName: string; startsAt: string; endsAt: string;
    limits: { users: number | null; assets: number | null }; modules: string[];
  };
  promotion: Record<string, unknown> | null;
};

const planNames = new Set(["free", "go", "plus", "pro", "custom"]);

function integer(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) ? number : 0;
}

function safeJson(value: string | null) {
  if (!value) return null;
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; }
}

function monthEnd(start: Date, months: number) {
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end.toISOString();
}

function durationBonusMonths(offer: PlanOffer | null) {
  if (!offer?.bonusEnabled) return 0;
  if (offer.bonusUnit === "year") return offer.bonusValue * 12;
  if (offer.bonusUnit === "month") return offer.bonusValue;
  return 0;
}

function activeOffer(offers: PlanOffer[], planId: string, now = Date.now()) {
  const offer = offers.find((row) => row.planId === planId) || null;
  if (!offer || (!offer.bonusEnabled && !offer.discountEnabled)) return null;
  const startsAt = offerDate(offer.startDate), expiresAt = offerDate(offer.endDate) + 86_400_000;
  return Number.isFinite(startsAt) && Number.isFinite(expiresAt) && now >= startsAt && now < expiresAt ? offer : null;
}

function quote(plan: PackageTier, durationMonths: number, offer: PlanOffer | null) {
  const baseAmountMnt = plan.monthlyMnt === null ? null : Math.max(0, Math.round(plan.monthlyMnt * durationMonths));
  let discountAmountMnt = 0;
  let finalAmountMnt = baseAmountMnt;
  if (baseAmountMnt !== null && offer?.discountEnabled) {
    if (offer.discountType === "percent") discountAmountMnt = Math.round(baseAmountMnt * offer.discountValue / 100);
    if (offer.discountType === "fixed") discountAmountMnt = Math.min(baseAmountMnt, Math.round(offer.discountValue));
    if (offer.discountType === "special" && offer.specialPriceMnt !== null) discountAmountMnt = Math.max(0, baseAmountMnt - offer.specialPriceMnt);
    finalAmountMnt = Math.max(0, baseAmountMnt - discountAmountMnt);
  }
  return { baseAmountMnt, discountAmountMnt, finalAmountMnt };
}

function normalizedPlanSnapshot(plan: PackageTier, config: PackageConfig) {
  const tierIndex = config.tiers.findIndex((tier) => tier.id === plan.id);
  return {
    id: plan.id, name: plan.name, users: plan.users, assets: plan.assets,
    monthlyMnt: plan.monthlyMnt, assignedModules: features.filter((feature) => config.assignments[feature.id] <= tierIndex).map((feature) => feature.id),
  };
}

function subscriptionStatus(row: SubscriptionRow) {
  const status = String(row.subscription_status || "payment_pending");
  const end = typeof row.ends_at === "string" ? row.ends_at : null;
  if (status === "active" && end && end <= new Date().toISOString()) return "expired";
  return status;
}

export function publicSubscription(row: SubscriptionRow | null) {
  if (!row) return null;
  return {
    id: String(row.id), organizationName: String(row.organization_name), planId: String(row.plan_id), planName: String(row.plan_name),
    plan: safeJson(typeof row.plan_snapshot_json === "string" ? row.plan_snapshot_json : null),
    durationMonths: integer(row.duration_months), baseAmountMnt: row.base_amount_mnt === null ? null : integer(row.base_amount_mnt),
    discountAmountMnt: integer(row.discount_amount_mnt), finalAmountMnt: row.final_amount_mnt === null ? null : integer(row.final_amount_mnt),
    promotion: safeJson(typeof row.promotion_snapshot_json === "string" ? row.promotion_snapshot_json : null),
    paymentStatus: String(row.payment_status), subscriptionStatus: subscriptionStatus(row),
    startsAt: typeof row.starts_at === "string" ? row.starts_at : null, endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
    coreTenantId: typeof row.core_tenant_id === "string" ? row.core_tenant_id : null,
    coreTenantAdminId: typeof row.core_tenant_admin_id === "string" ? row.core_tenant_admin_id : null,
    coreWorkspaceUrl: typeof row.core_workspace_url === "string" ? row.core_workspace_url : null,
    provisioningStatus: String(row.provisioning_status), lastProvisioningAttemptAt: typeof row.last_provisioning_attempt_at === "string" ? row.last_provisioning_attempt_at : null,
    provisionedAt: typeof row.provisioned_at === "string" ? row.provisioned_at : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function refreshExpiredSubscriptions(userId?: string) {
  const now = new Date().toISOString();
  const where = userId ? " AND user_id=?" : "";
  const statement = env.DB.prepare(`UPDATE site_user_subscriptions SET subscription_status='expired',updated_at=? WHERE subscription_status='active' AND ends_at IS NOT NULL AND ends_at<=?${where}`);
  await (userId ? statement.bind(now, now, userId) : statement.bind(now, now)).run();
}

export async function latestSubscriptionForUser(userId: string) {
  await refreshExpiredSubscriptions(userId);
  return env.DB.prepare("SELECT * FROM site_user_subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(userId).first<SubscriptionRow>();
}

export async function subscriptionCatalog() {
  const [{ state }, { offer }] = await Promise.all([readPackageState(), readLaunchOffer()]);
  const config = normalizeConfig(state.published);
  const publicOffers = publicLaunchOffer(offer);
  return {
    plans: config.tiers.map((plan) => ({
      id: plan.id, name: plan.name, users: plan.users, assets: plan.assets, monthlyMnt: plan.monthlyMnt,
      minPaidMonths: plan.minPaidMonths, maxPaidMonths: plan.maxPaidMonths, allowMonths: plan.allowMonths, allowYears: plan.allowYears, stepMonths: plan.stepMonths,
    })),
    offers: publicOffers.plans,
  };
}

export async function createSubscriptionRequest(input: {
  user: { id: string; fullName: string; email: string };
  organizationName: unknown; planId: unknown; durationValue: unknown; durationUnit: unknown;
}) {
  const organizationName = typeof input.organizationName === "string" ? input.organizationName.trim().replace(/\s+/g, " ").slice(0, 160) : "";
  const planId = typeof input.planId === "string" ? input.planId.trim().toLowerCase() : "";
  const durationValue = integer(input.durationValue), durationUnit = input.durationUnit === "year" ? "year" : input.durationUnit === "month" ? "month" : "";
  if (organizationName.length < 2) throw new Error("Байгууллагын нэрийг оруулна уу.");
  if (!planNames.has(planId) || !durationUnit) throw new Error("Багц болон хугацаагаа сонгоно уу.");
  const [{ state }, { offer }] = await Promise.all([readPackageState(), readLaunchOffer()]);
  const config = normalizeConfig(state.published), plan = config.tiers.find((row) => row.id === planId);
  if (!plan) throw new Error("Сонгосон багц олдсонгүй.");
  const durationMonths = durationUnit === "year" ? durationValue * 12 : durationValue;
  if (!durationValue || durationMonths < plan.minPaidMonths || durationMonths > plan.maxPaidMonths || durationMonths % plan.stepMonths !== 0 || (durationUnit === "month" && !plan.allowMonths) || (durationUnit === "year" && !plan.allowYears)) throw new Error("Сонгосон хугацаа энэ багцын админ хязгаарт тохирохгүй байна.");
  const currentOffer = activeOffer(offer.plans, plan.id), amounts = quote(plan, durationMonths, currentOffer);
  const now = new Date().toISOString(), id = crypto.randomUUID(), isQuote = plan.monthlyMnt === null;
  const planSnapshot = normalizedPlanSnapshot(plan, config);
  const offerSnapshot = currentOffer ? { ...currentOffer, appliedAt: now, bonusMonths: durationBonusMonths(currentOffer) } : null;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO site_user_subscriptions (id,user_id,organization_name,plan_id,plan_name,plan_snapshot_json,duration_months,base_amount_mnt,discount_amount_mnt,final_amount_mnt,promotion_snapshot_json,payment_status,subscription_status,provisioning_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, input.user.id, organizationName, plan.id, plan.name, JSON.stringify(planSnapshot), durationMonths, amounts.baseAmountMnt, amounts.discountAmountMnt, amounts.finalAmountMnt, offerSnapshot ? JSON.stringify(offerSnapshot) : null,
      isQuote ? "quote_requested" : "pending", isQuote ? "quote_requested" : "payment_pending", "not_requested", now, now,
    ),
    env.DB.prepare("INSERT INTO site_user_subscription_events (id,subscription_id,user_id,event_type,actor_type,actor_id,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(
      crypto.randomUUID(), id, input.user.id, isQuote ? "quote_requested" : "plan_selected", "site_user", input.user.id,
      JSON.stringify({ organizationName, planId: plan.id, durationMonths, amount: amounts.finalAmountMnt, promotion: offerSnapshot ? { nameMn: currentOffer?.nameMn, nameEn: currentOffer?.nameEn } : null }), now,
    ),
  ]);
  return latestSubscriptionForUser(input.user.id);
}

export function provisioningPayload(row: SubscriptionRow, user: { id: string; fullName: string; email: string }): ProvisioningPayload | null {
  const plan = safeJson(String(row.plan_snapshot_json || ""));
  const startsAt = typeof row.starts_at === "string" ? row.starts_at : null, endsAt = typeof row.ends_at === "string" ? row.ends_at : null;
  if (!plan || !startsAt || !endsAt) return null;
  return {
    schemaVersion: 1, requestId: crypto.randomUUID(), source: "ibex-home-web",
    organization: { name: String(row.organization_name) },
    tenantAdmin: { homeWebUserId: user.id, fullName: user.fullName, email: user.email },
    entitlement: {
      subscriptionId: String(row.id), planId: String(row.plan_id), planName: String(row.plan_name), startsAt, endsAt,
      limits: { users: typeof plan.users === "number" ? plan.users : null, assets: typeof plan.assets === "number" ? plan.assets : null },
      modules: Array.isArray(plan.assignedModules) ? plan.assignedModules.filter((item): item is string => typeof item === "string") : [],
    },
    promotion: safeJson(typeof row.promotion_snapshot_json === "string" ? row.promotion_snapshot_json : null),
  };
}

async function existingProvisioningRequest(idempotencyKey: string) {
  const row = await env.DB.prepare("SELECT id,subscription_id,payload_json FROM site_user_provisioning_outbox WHERE idempotency_key=? LIMIT 1")
    .bind(idempotencyKey)
    .first<{ id: string; subscription_id: string; payload_json: string }>();
  if (!row) return null;
  try {
    return { subscriptionId: row.subscription_id, outboxId: row.id, payload: JSON.parse(row.payload_json) as ProvisioningPayload, created: false };
  } catch {
    throw new Error("Тенант бэлтгэх хадгалсан өгөгдөл гэмтсэн байна.");
  }
}

export async function confirmSubscriptionPayment(subscriptionId: string, actor: { id: string; type: "admin" }) {
  const row = await env.DB.prepare("SELECT * FROM site_user_subscriptions WHERE id=? LIMIT 1").bind(subscriptionId).first<SubscriptionRow>();
  if (!row) throw new Error("Багцын хүсэлт олдсонгүй.");
  if (row.plan_id === "custom") throw new Error("Үнийн саналыг тусад нь тохиролцсоны дараа батална.");
  const idempotencyKey = `payment:${subscriptionId}`;
  if (String(row.payment_status) === "confirmed") {
    const existing = await existingProvisioningRequest(idempotencyKey);
    if (existing) return existing;
  }
  if (!["pending", "rejected"].includes(String(row.payment_status))) throw new Error("Энэ хүсэлтийн төлбөрийн төлөвийг дахин батлах боломжгүй.");
  const now = new Date(), startedAt = now.toISOString(), promotion = safeJson(typeof row.promotion_snapshot_json === "string" ? row.promotion_snapshot_json : null);
  const bonusMonths = typeof promotion?.bonusMonths === "number" ? promotion.bonusMonths : 0;
  const endsAt = monthEnd(now, integer(row.duration_months) + bonusMonths);
  const payloadRow = { ...row, starts_at: startedAt, ends_at: endsAt } as SubscriptionRow;
  const user = await env.DB.prepare("SELECT id,full_name,email FROM site_users WHERE id=? LIMIT 1").bind(row.user_id).first<{ id: string; full_name: string; email: string }>();
  if (!user) throw new Error("Хэрэглэгч олдсонгүй.");
  const payload = provisioningPayload(payloadRow, { id: user.id, fullName: user.full_name, email: user.email });
  if (!payload) throw new Error("Тенант бэлтгэх өгөгдөл бүрэн биш байна.");
  const timestamp = now.toISOString(), outboxId = crypto.randomUUID();
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE site_user_subscriptions SET payment_status='confirmed',payment_confirmation_key=?,subscription_status='provisioning_pending',starts_at=?,ends_at=?,provisioning_status='pending',updated_at=? WHERE id=? AND payment_status IN ('pending','rejected') AND payment_confirmation_key IS NULL")
      .bind(idempotencyKey, startedAt, endsAt, timestamp, subscriptionId),
    env.DB.prepare("INSERT OR IGNORE INTO site_user_provisioning_outbox (id,subscription_id,idempotency_key,status,attempt_count,payload_json,created_at,updated_at) SELECT ?,?,?,'pending',0,?,?,? WHERE changes()=1")
      .bind(outboxId, subscriptionId, idempotencyKey, JSON.stringify(payload), timestamp, timestamp),
    env.DB.prepare("INSERT OR IGNORE INTO site_user_subscription_events (id,subscription_id,idempotency_key,user_id,event_type,actor_type,actor_id,payload_json,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE changes()=1")
      .bind(crypto.randomUUID(), subscriptionId, idempotencyKey, String(row.user_id), "payment_confirmed", actor.type, actor.id, JSON.stringify({ startsAt: startedAt, endsAt, outboxId }), timestamp),
  ]);
  if (Number(results[0]?.meta?.changes || 0) === 1) return { subscriptionId, outboxId, payload, created: true };
  const existing = await existingProvisioningRequest(idempotencyKey);
  if (existing) return existing;
  throw new Error("Төлбөрийн баталгаажуулалт зэрэгцээ хүсэлтээр өөрчлөгдсөн байна.");
}

export async function queueProvisioningRetry(subscriptionId: string, actor: { id: string; type: "admin" }) {
  const row = await env.DB.prepare("SELECT * FROM site_user_subscriptions WHERE id=? LIMIT 1").bind(subscriptionId).first<SubscriptionRow>();
  if (!row) throw new Error("Багцын хүсэлт олдсонгүй.");
  if (String(row.payment_status) !== "confirmed") throw new Error("Эхлээд төлбөрийг Home Web дээр батална.");
  const user = await env.DB.prepare("SELECT id,full_name,email FROM site_users WHERE id=? LIMIT 1").bind(row.user_id).first<{ id: string; full_name: string; email: string }>();
  if (!user) throw new Error("Хэрэглэгч олдсонгүй.");
  const payload = provisioningPayload(row, { id: user.id, fullName: user.full_name, email: user.email });
  if (!payload) throw new Error("Тенант бэлтгэх өгөгдөл бүрэн биш байна.");
  const latest = await env.DB.prepare("SELECT id,status FROM site_user_provisioning_outbox WHERE subscription_id=? ORDER BY created_at DESC LIMIT 1")
    .bind(subscriptionId).first<{ id: string; status: string }>();
  if (latest && ["pending", "accepted"].includes(latest.status)) {
    const existing = await env.DB.prepare("SELECT idempotency_key FROM site_user_provisioning_outbox WHERE id=? LIMIT 1").bind(latest.id).first<{ idempotency_key: string | null }>();
    if (existing?.idempotency_key) {
      const request = await existingProvisioningRequest(existing.idempotency_key);
      if (request) return request;
    }
    throw new Error(latest.status === "accepted" ? "Тенант аль хэдийн идэвхжсэн байна." : "Тенант бэлтгэх хүсэлт аль хэдийн дараалалд байна.");
  }
  const now = new Date().toISOString(), outboxId = crypto.randomUUID();
  const idempotencyKey = `retry:${subscriptionId}:${latest?.id || "initial"}`;
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE site_user_subscriptions SET subscription_status='provisioning_pending',provisioning_status='pending',updated_at=? WHERE id=? AND payment_status='confirmed' AND provisioning_status IN ('failed','pending_connection')")
      .bind(now, subscriptionId),
    env.DB.prepare("INSERT OR IGNORE INTO site_user_provisioning_outbox (id,subscription_id,idempotency_key,status,attempt_count,payload_json,created_at,updated_at) SELECT ?,?,?,'pending',0,?,?,? WHERE changes()=1")
      .bind(outboxId, subscriptionId, idempotencyKey, JSON.stringify(payload), now, now),
    env.DB.prepare("INSERT OR IGNORE INTO site_user_subscription_events (id,subscription_id,idempotency_key,user_id,event_type,actor_type,actor_id,payload_json,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE changes()=1")
      .bind(crypto.randomUUID(), subscriptionId, idempotencyKey, String(row.user_id), "provisioning_retry_queued", actor.type, actor.id, JSON.stringify({ outboxId }), now),
  ]);
  if (Number(results[0]?.meta?.changes || 0) === 1) return { subscriptionId, outboxId, payload, created: true };
  const existing = await existingProvisioningRequest(idempotencyKey);
  if (existing) return existing;
  throw new Error("Тенант бэлтгэх төлөв зэрэгцээ хүсэлтээр өөрчлөгдсөн байна.");
}

export async function recordProvisioningResult(input: { subscriptionId: string; outboxId: string; status: "accepted" | "pending_connection" | "failed"; response: Record<string, unknown>; actorId?: string }) {
  const now = new Date().toISOString(), accepted = input.status === "accepted";
  const coreTenantId = typeof input.response.tenantId === "string" ? input.response.tenantId.slice(0, 160) : null;
  const coreTenantAdminId = typeof input.response.tenantAdminId === "string" ? input.response.tenantAdminId.slice(0, 160) : null;
  const workspaceUrl = typeof input.response.workspaceUrl === "string" && /^https:\/\//.test(input.response.workspaceUrl) ? input.response.workspaceUrl.slice(0, 2000) : null;
  const row = await env.DB.prepare("SELECT user_id FROM site_user_subscriptions WHERE id=? LIMIT 1").bind(input.subscriptionId).first<{ user_id: string }>();
  if (!row) return;
  await env.DB.batch([
    env.DB.prepare("UPDATE site_user_provisioning_outbox SET status=?,attempt_count=attempt_count+1,response_json=?,last_attempt_at=?,delivered_at=?,updated_at=? WHERE id=?").bind(input.status, JSON.stringify(input.response).slice(0, 12000), now, accepted ? now : null, now, input.outboxId),
    env.DB.prepare("UPDATE site_user_subscriptions SET subscription_status=?,provisioning_status=?,core_tenant_id=COALESCE(?,core_tenant_id),core_tenant_admin_id=COALESCE(?,core_tenant_admin_id),core_workspace_url=COALESCE(?,core_workspace_url),last_provisioning_attempt_at=?,provisioned_at=?,updated_at=? WHERE id=?").bind(accepted ? "active" : "provisioning_pending", input.status, coreTenantId, coreTenantAdminId, workspaceUrl, now, accepted ? now : null, now, input.subscriptionId),
    env.DB.prepare("INSERT INTO site_user_subscription_events (id,subscription_id,user_id,event_type,actor_type,actor_id,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), input.subscriptionId, row.user_id, `provisioning_${input.status}`, "system", input.actorId || null, JSON.stringify(input.response).slice(0, 12000), now),
  ]);
}
