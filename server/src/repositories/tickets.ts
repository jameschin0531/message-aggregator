// Tickets, drafts, reviews.
import type { Db } from "../db/pool.js";

export interface TicketRow {
  id: string;
  conversation_id: string;
  shop_id: string;
  channel: string;
  buyer_ref: string;
  category: string | null;
  priority: string | null;
  priority_reasons: string[];
  language: string | null;
  order_id: string | null;
  extracted_order_ref: string | null;
  needs_human: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const TICKET_SELECT = `
  SELECT t.*, c.shop_id, s.channel, c.buyer_ref
  FROM tickets t JOIN conversations c ON c.id = t.conversation_id JOIN shops s ON s.id = c.shop_id`;

/** The open ticket for a conversation, creating one if needed. A new buyer message sends it back to 'new'. */
export async function openTicketFor(db: Db, conversationId: string): Promise<string> {
  const existing = await db.query(
    `UPDATE tickets SET status = 'new', updated_at = now()
     WHERE conversation_id = $1 AND status IN ('new', 'triaged') RETURNING id`,
    [conversationId],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const { rows } = await db.query(`INSERT INTO tickets (conversation_id) VALUES ($1) RETURNING id`, [conversationId]);
  return rows[0].id;
}

export async function getTicket(db: Db, id: string): Promise<TicketRow | null> {
  const { rows } = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listTickets(db: Db, statuses: string[]): Promise<(TicketRow & { last_message_at: Date; preview: string | null })[]> {
  const { rows } = await db.query(
    `SELECT t.*, c.shop_id, s.channel, c.buyer_ref, c.last_message_at,
       (SELECT m.text FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'buyer'
         ORDER BY m.created_at_channel DESC LIMIT 1) AS preview
     FROM tickets t JOIN conversations c ON c.id = t.conversation_id JOIN shops s ON s.id = c.shop_id
     WHERE t.status = ANY($1)
     ORDER BY coalesce(t.priority, 'P0'), c.last_message_at ASC`, // untriaged first, then P1..P3, oldest first
    [statuses],
  );
  return rows;
}

export async function saveTriage(
  db: Db,
  id: string,
  t: {
    category: string;
    priority: string;
    priorityReasons: string[];
    language: string;
    orderId: string | null;
    extractedOrderRef: string | null;
    needsHuman: boolean;
  },
): Promise<void> {
  await db.query(
    `UPDATE tickets SET category = $2, priority = $3, priority_reasons = $4, language = $5, order_id = $6,
       extracted_order_ref = $7, needs_human = $8, status = 'triaged', updated_at = now()
     WHERE id = $1`,
    [id, t.category, t.priority, t.priorityReasons, t.language, t.orderId, t.extractedOrderRef, t.needsHuman],
  );
}

export async function setTicketStatus(db: Db, id: string, status: string): Promise<void> {
  await db.query(`UPDATE tickets SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
}

export interface NewDraft {
  ticketId: string;
  text: string;
  policyRefs: { id: string; topic: string; version: number }[];
  safetyFlags: string[];
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
}

export async function insertDraft(db: Db, d: NewDraft): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO drafts (ticket_id, text, policy_refs, safety_flags, model, prompt_version, input_tokens, output_tokens, cost, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [d.ticketId, d.text, JSON.stringify(d.policyRefs), d.safetyFlags, d.model, d.promptVersion, d.inputTokens, d.outputTokens, d.cost, d.latencyMs],
  );
  return rows[0].id;
}

export async function latestDraft(db: Db, ticketId: string) {
  const { rows } = await db.query(`SELECT * FROM drafts WHERE ticket_id = $1 ORDER BY created_at DESC LIMIT 1`, [ticketId]);
  return rows[0] ?? null;
}

export async function getDraft(db: Db, id: string) {
  const { rows } = await db.query(`SELECT * FROM drafts WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function insertReview(
  db: Db,
  r: { draftId: string; finalText: string; accepted: boolean; editRatio: number; reason: string | null },
): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO reviews (draft_id, final_text, accepted, edit_ratio, reason) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [r.draftId, r.finalText, r.accepted, r.editRatio, r.reason],
  );
  return rows[0].id;
}

export async function audit(db: Db, actor: string, action: string, target: string | null, detail?: unknown): Promise<void> {
  await db.query(`INSERT INTO audit_log (actor, action, target, detail) VALUES ($1, $2, $3, $4)`, [
    actor,
    action,
    target,
    detail === undefined ? null : JSON.stringify(detail),
  ]);
}
