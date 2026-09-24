import { env } from "cloudflare:workers";
import { defaultLaunchOffer, validateLaunchOffer, type LaunchOffer } from "./launch-offer-model";

const OFFER_KEY = "launchOffer";
export async function readLaunchOffer() {
  const row = await env.DB.prepare("SELECT value_json FROM site_content WHERE key = ?").bind(OFFER_KEY).first<{value_json: string}>();
  if (!row) return { offer: structuredClone(defaultLaunchOffer), revision: 0, raw: null };
  const state = JSON.parse(row.value_json);
  if (!Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error("Invalid offer revision");
  return { offer: validateLaunchOffer(state.offer), revision: state.revision as number, raw: row.value_json };
}
export async function saveLaunchOffer(offer: LaunchOffer, revision: number, userId: string) {
  const state = await readLaunchOffer();
  if (revision !== state.revision) return null;
  const next = { offer, revision: revision + 1 }, value = JSON.stringify(next), now = new Date().toISOString();
  const write = state.raw === null
    ? env.DB.prepare("INSERT INTO site_content (key,value_json,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO NOTHING").bind(OFFER_KEY, value, userId, now)
    : env.DB.prepare("UPDATE site_content SET value_json=?,updated_by=?,updated_at=? WHERE key=? AND value_json=?").bind(value, userId, now, OFFER_KEY, state.raw);
  const result = await write.run();
  return (result.meta?.changes ?? 0) > 0 ? next : null;
}
