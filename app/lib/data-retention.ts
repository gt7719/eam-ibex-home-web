import type { RuntimeEnv } from "../runtime/contracts";
import { readHomeAiSettings } from "./home-ai-control";

export async function purgeExpiredAccounts(runtime: RuntimeEnv, now = new Date()) {
  const cutoff = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rows = await runtime.DB.prepare(
    "SELECT id FROM site_users WHERE account_status='deletion_requested' AND deletion_requested_at IS NOT NULL AND deletion_requested_at <= ? LIMIT 50",
  )
    .bind(cutoff)
    .all<{ id: string }>();
  const ids = (rows.results || []).map((row) => row.id).filter(Boolean);
  for (const id of ids) {
    const image = await runtime.DB.prepare("SELECT object_key FROM site_user_profile_images WHERE user_id=? LIMIT 1").bind(id).first<{ object_key: string }>();
    // Keep the database pointer until storage deletion succeeds, so a failure can retry.
    if (image?.object_key) await runtime.BUCKET.delete(image.object_key);
    await runtime.DB.batch([
      runtime.DB.prepare("DELETE FROM site_user_profile_images WHERE user_id=?").bind(id),
      runtime.DB.prepare("DELETE FROM site_user_sessions WHERE user_id=?").bind(id),
      runtime.DB.prepare("DELETE FROM site_user_tokens WHERE user_id=?").bind(id),
      runtime.DB.prepare("DELETE FROM site_user_consents WHERE user_id=?").bind(id),
      runtime.DB.prepare("DELETE FROM customer_ai_messages WHERE user_id=?").bind(id),
      runtime.DB.prepare("DELETE FROM auth_delivery_events WHERE user_id=?").bind(
        id,
      ),
      runtime.DB.prepare(
        "DELETE FROM site_user_sms_verifications WHERE user_id=?",
      ).bind(id),
      runtime.DB.prepare(
        "DELETE FROM site_user_access_requests WHERE user_id=?",
      ).bind(id),
      runtime.DB.prepare(
        "DELETE FROM site_user_subscription_events WHERE user_id=?",
      ).bind(id),
      runtime.DB.prepare(
        "DELETE FROM site_user_provisioning_outbox WHERE subscription_id IN (SELECT id FROM site_user_subscriptions WHERE user_id=?)",
      ).bind(id),
      runtime.DB.prepare(
        "DELETE FROM site_user_subscriptions WHERE user_id=?",
      ).bind(id),
      runtime.DB.prepare(
        "DELETE FROM site_users WHERE id=? AND account_status='deletion_requested'",
      ).bind(id),
    ]);
  }
  return ids.length;
}

export async function runDataRetention(runtime: RuntimeEnv, now = new Date()) {
  const { settings } = await readHomeAiSettings(runtime.DB);
  const cutoff = new Date(now.getTime() - settings.historyRetentionDays * 86_400_000).toISOString();
  await runtime.DB.prepare("DELETE FROM customer_ai_messages WHERE created_at<?").bind(cutoff).run();
  const purged = await purgeExpiredAccounts(runtime, now);
  return { purged, historyRetentionDays: settings.historyRetentionDays };
}
