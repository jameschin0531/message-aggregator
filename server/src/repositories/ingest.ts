// Shops, conversations, messages, ingestion events.
import type { Db } from "../db/pool.js";
import type { Channel, NormalizedMessage } from "../channels/types.js";

export async function upsertShop(db: Db, channel: Channel, externalShopId: string): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO shops (channel, external_shop_id) VALUES ($1, $2)
     ON CONFLICT (channel, external_shop_id) DO UPDATE SET channel = EXCLUDED.channel
     RETURNING id`,
    [channel, externalShopId],
  );
  return rows[0].id;
}

export async function upsertConversation(db: Db, shopId: string, m: NormalizedMessage): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO conversations (shop_id, channel_conversation_id, buyer_ref, last_message_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (shop_id, channel_conversation_id)
       DO UPDATE SET last_message_at = GREATEST(conversations.last_message_at, EXCLUDED.last_message_at)
     RETURNING id`,
    [shopId, m.channelConversationId, m.buyerRef, m.createdAt],
  );
  return rows[0].id;
}

/** Returns the new message id, or null when it was a duplicate (unique on shop + channel message id). */
export async function insertMessage(db: Db, shopId: string, conversationId: string, m: NormalizedMessage): Promise<string | null> {
  const { rows } = await db.query(
    `INSERT INTO messages (shop_id, channel, conversation_id, channel_message_id, sender_type, message_type, text, raw_payload, created_at_channel)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (shop_id, channel_message_id) DO NOTHING
     RETURNING id`,
    [shopId, m.channel, conversationId, m.channelMessageId, m.senderType, m.messageType, m.text, JSON.stringify(m.raw), m.createdAt],
  );
  return rows[0]?.id ?? null;
}

export async function logIngestionEvent(
  db: Db,
  shopId: string | null,
  kind: "webhook" | "poll" | "import" | "duplicate" | "error",
  messageRef: string | null,
  detail?: unknown,
): Promise<void> {
  await db.query(`INSERT INTO ingestion_events (shop_id, kind, message_ref, detail) VALUES ($1, $2, $3, $4)`, [
    shopId,
    kind,
    messageRef,
    detail === undefined ? null : JSON.stringify(detail),
  ]);
}

export async function touchSyncState(db: Db, shopId: string, lastMessageAt: Date): Promise<void> {
  await db.query(
    `INSERT INTO sync_state (shop_id, last_message_at) VALUES ($1, $2)
     ON CONFLICT (shop_id) DO UPDATE SET last_message_at = GREATEST(sync_state.last_message_at, EXCLUDED.last_message_at)`,
    [shopId, lastMessageAt],
  );
}

export interface ConversationMessage {
  sender_type: "buyer" | "seller" | "system";
  message_type: string;
  text: string | null;
  created_at_channel: Date;
}

export async function recentMessages(db: Db, conversationId: string, limit = 20): Promise<ConversationMessage[]> {
  const { rows } = await db.query(
    `SELECT sender_type, message_type, text, created_at_channel FROM (
       SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at_channel DESC LIMIT $2
     ) m ORDER BY created_at_channel`,
    [conversationId, limit],
  );
  return rows;
}
