import type { CustomerAiDatabase, CustomerAiHistoryItem } from "./customer-ai";

const MAX_STORED_MESSAGES = 120;

export async function readHomeAiHistory(
  db: CustomerAiDatabase,
  userId: string,
): Promise<CustomerAiHistoryItem[]> {
  const result = await db.prepare(
    `SELECT role,content FROM (
       SELECT role,content,created_at,request_id,message_order
       FROM customer_ai_messages
       WHERE user_id=?
       ORDER BY created_at DESC,request_id DESC,message_order DESC
       LIMIT ?
     ) ORDER BY created_at ASC,request_id ASC,message_order ASC`,
  ).bind(userId, MAX_STORED_MESSAGES).all<{ role: string; content: string }>();
  return (result.results || []).flatMap((row) =>
    (row.role === "user" || row.role === "assistant") && row.content
      ? [{ role: row.role, content: row.content }]
      : [],
  );
}

export async function saveHomeAiExchange(input: {
  db: CustomerAiDatabase;
  userId: string;
  requestId: string;
  userMessage: string;
  assistantMessage: string;
  createdAt?: string;
}) {
  const createdAt = input.createdAt || new Date().toISOString();
  await input.db.batch([
    input.db.prepare(
      "INSERT INTO customer_ai_messages (id,user_id,request_id,message_order,role,content,created_at) VALUES (?,?,?,?,?,?,?)",
    ).bind(crypto.randomUUID(), input.userId, input.requestId, 0, "user", input.userMessage, createdAt),
    input.db.prepare(
      "INSERT INTO customer_ai_messages (id,user_id,request_id,message_order,role,content,created_at) VALUES (?,?,?,?,?,?,?)",
    ).bind(crypto.randomUUID(), input.userId, input.requestId, 1, "assistant", input.assistantMessage, createdAt),
  ]);
}

export async function clearHomeAiHistory(db: CustomerAiDatabase, userId: string) {
  await db.prepare("DELETE FROM customer_ai_messages WHERE user_id=?").bind(userId).run();
}
