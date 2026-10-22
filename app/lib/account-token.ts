import type { RuntimeDatabase } from "../runtime/contracts";

// Claim the token before changing credentials. The claim and every side effect
// live in one transaction on both D1 and PostgreSQL; a competing claim changes 0 rows.
export async function resetPasswordWithToken(db: RuntimeDatabase, input: {
  tokenId: string; userId: string; hash: string; salt: string; now: string;
}) {
  const claim = `processing:${crypto.randomUUID()}`;
  const owned = "EXISTS (SELECT 1 FROM site_user_tokens WHERE id=? AND status=?)";
  const results = await db.batch([
    db.prepare("UPDATE site_user_tokens SET status=? WHERE id=? AND user_id=? AND purpose='password_reset' AND status='pending' AND expires_at>?")
      .bind(claim, input.tokenId, input.userId, input.now),
    db.prepare(`UPDATE site_users SET password_hash=?,password_salt=?,updated_at=? WHERE id=? AND ${owned}`)
      .bind(input.hash, input.salt, input.now, input.userId, input.tokenId, claim),
    db.prepare(`UPDATE site_user_tokens SET status='invalidated' WHERE user_id=? AND purpose='password_reset' AND id!=? AND status='pending' AND ${owned}`)
      .bind(input.userId, input.tokenId, input.tokenId, claim),
    db.prepare(`UPDATE site_user_sessions SET status='password_changed',revoked_at=? WHERE user_id=? AND status='active' AND ${owned}`)
      .bind(input.now, input.userId, input.tokenId, claim),
    db.prepare("UPDATE site_user_tokens SET status='used',used_at=? WHERE id=? AND status=?")
      .bind(input.now, input.tokenId, claim),
  ]);
  return Number(results[0]?.meta?.changes || 0) === 1 && Number(results[1]?.meta?.changes || 0) === 1;
}
