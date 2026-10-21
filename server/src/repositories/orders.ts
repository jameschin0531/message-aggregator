// Orders and policies.
import type { Db } from "../db/pool.js";
import type { NormalizedOrder } from "../channels/types.js";

export interface OrderRow {
  id: string;
  shop_id: string;
  channel: string;
  channel_order_id: string;
  sitegiant_order_no: string | null;
  items: unknown;
  status: NormalizedOrder["status"];
  tracking_no: string | null;
  created_at: Date;
  shipped_at: Date | null;
  delivered_at: Date | null;
  promised_delivery_at: Date | null;
}

export async function upsertOrder(db: Db, shopId: string, o: NormalizedOrder): Promise<void> {
  await db.query(
    `INSERT INTO orders (shop_id, channel, channel_order_id, sitegiant_order_no, items, status, tracking_no,
                         created_at, shipped_at, delivered_at, promised_delivery_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (shop_id, channel_order_id) DO UPDATE SET
       sitegiant_order_no = coalesce(EXCLUDED.sitegiant_order_no, orders.sitegiant_order_no),
       items = EXCLUDED.items, status = EXCLUDED.status, tracking_no = EXCLUDED.tracking_no,
       shipped_at = EXCLUDED.shipped_at, delivered_at = EXCLUDED.delivered_at,
       promised_delivery_at = EXCLUDED.promised_delivery_at`,
    [
      shopId,
      o.channel,
      o.channelOrderId,
      o.sitegiantOrderNo ?? null,
      JSON.stringify(o.items),
      o.status,
      o.trackingNo ?? null,
      o.createdAt,
      o.shippedAt ?? null,
      o.deliveredAt ?? null,
      o.promisedDeliveryAt ?? null,
    ],
  );
}

/**
 * Orders matching any of the refs, by platform order id or SiteGiant order number. Searches every channel
 * of the same shop, so a manually imported message can still match a Shopee or TikTok order.
 */
export async function findOrdersByRefs(db: Db, shopId: string, refs: string[]): Promise<OrderRow[]> {
  if (!refs.length) return [];
  const { rows } = await db.query(
    `SELECT o.* FROM orders o JOIN shops s ON s.id = o.shop_id
     WHERE s.external_shop_id = (SELECT external_shop_id FROM shops WHERE id = $1)
       AND (upper(o.channel_order_id) = ANY($2) OR upper(o.sitegiant_order_no) = ANY($2))`,
    [shopId, refs.map((r) => r.toUpperCase())],
  );
  return rows;
}

export async function getOrder(db: Db, id: string): Promise<OrderRow | null> {
  const { rows } = await db.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export interface PolicyRow {
  id: string;
  scope: string;
  topic: string;
  text: string;
  version: number;
}

/** Latest effective version per topic; a channel-specific policy beats the shop-wide one. */
export async function currentPolicies(db: Db, channel: string, topics: string[]): Promise<PolicyRow[]> {
  if (!topics.length) return [];
  const { rows } = await db.query(
    `SELECT DISTINCT ON (topic) id, scope, topic, text, version
     FROM policies
     WHERE topic = ANY($1) AND scope IN ('shop', $2) AND effective_from <= now()
     ORDER BY topic, (scope = $2) DESC, version DESC`,
    [topics, channel],
  );
  return rows;
}

export async function insertPolicy(db: Db, p: { scope: string; topic: string; text: string }): Promise<PolicyRow> {
  const { rows } = await db.query(
    `INSERT INTO policies (scope, topic, text, version)
     VALUES ($1, $2, $3, coalesce((SELECT max(version) FROM policies WHERE scope = $1 AND topic = $2), 0) + 1)
     RETURNING id, scope, topic, text, version`,
    [p.scope, p.topic, p.text],
  );
  return rows[0];
}

export async function listPolicies(db: Db): Promise<PolicyRow[]> {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (scope, topic) id, scope, topic, text, version FROM policies ORDER BY scope, topic, version DESC`,
  );
  return rows;
}
