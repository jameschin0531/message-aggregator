// Manual import: the Phase A source, and the fallback whenever the APIs are down or not approved.
// Accepts JSON (an array of messages / orders) or a pasted conversation.
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Channel, NormalizedMessage, NormalizedOrder } from "./types.js";

const channelSchema = z.enum(["shopee", "tiktok", "manual"]);

export const importMessageSchema = z.object({
  channel: channelSchema.default("manual"),
  shop: z.string().default("mom-shop"),
  conversation: z.string().optional(),
  buyer: z.string().min(1), // whatever the seller sees; pseudonymized below
  id: z.string().optional(),
  sender: z.enum(["buyer", "seller", "system"]).default("buyer"),
  type: z.string().default("text"),
  text: z.string().nullable().default(null),
  at: z.coerce.date().default(() => new Date()),
});
export type ImportMessage = z.input<typeof importMessageSchema>;

export const importOrderSchema = z.object({
  channel: channelSchema,
  shop: z.string().default("mom-shop"),
  order_id: z.string().min(1),
  sitegiant_order_no: z.string().nullish(),
  items: z
    .array(z.object({ sku: z.string().optional(), name: z.string(), qty: z.number().int().positive(), variant: z.string().optional() }))
    .default([]),
  status: z.enum(["unpaid", "to_ship", "shipped", "delivered", "cancelled", "returned"]),
  tracking_no: z.string().nullish(),
  created_at: z.coerce.date(),
  shipped_at: z.coerce.date().nullish(),
  delivered_at: z.coerce.date().nullish(),
  promised_delivery_at: z.coerce.date().nullish(),
});
export type ImportOrder = z.input<typeof importOrderSchema>;

/** Stable pseudonym, so the same buyer maps to the same ref without storing their name. */
export function pseudonymize(channel: Channel, buyer: string): string {
  return "buyer_" + createHash("sha256").update(`${channel}:${buyer.trim().toLowerCase()}`).digest("hex").slice(0, 10);
}

export function normalizeMessages(input: unknown[]): NormalizedMessage[] {
  return input.map((row) => {
    const m = importMessageSchema.parse(row);
    const buyerRef = pseudonymize(m.channel, m.buyer);
    const conversation = m.conversation ?? buyerRef;
    // Without a platform id, derive one from content so re-importing the same file is idempotent.
    const id =
      m.id ?? createHash("sha256").update(`${conversation}|${m.sender}|${m.at.toISOString()}|${m.text ?? ""}`).digest("hex").slice(0, 16);
    return {
      channel: m.channel,
      externalShopId: m.shop,
      channelConversationId: conversation,
      channelMessageId: id,
      buyerRef,
      senderType: m.sender,
      messageType: m.type,
      text: m.text,
      createdAt: m.at,
      raw: { ...m, buyer: buyerRef }, // never keep the original buyer name in raw_payload
    };
  });
}

export function normalizeOrders(input: unknown[]): NormalizedOrder[] {
  return input.map((row) => {
    const o = importOrderSchema.parse(row);
    return {
      channel: o.channel,
      externalShopId: o.shop,
      channelOrderId: o.order_id,
      sitegiantOrderNo: o.sitegiant_order_no ?? null,
      items: o.items,
      status: o.status,
      trackingNo: o.tracking_no ?? null,
      createdAt: o.created_at,
      shippedAt: o.shipped_at ?? null,
      deliveredAt: o.delivered_at ?? null,
      promisedDeliveryAt: o.promised_delivery_at ?? null,
    };
  });
}

/**
 * Parse a conversation pasted from a seller app, one message per line:
 *   "B: text"  buyer      "S: text"  seller
 * Lines without a prefix continue the previous message.
 */
export function parsePastedConversation(opts: { channel: Channel; buyer: string; text: string; shop?: string }): ImportMessage[] {
  const out: ImportMessage[] = [];
  const base = Date.now();
  for (const line of opts.text.split(/\r?\n/)) {
    const match = line.match(/^\s*([BS])\s*[:：]\s*(.*)$/i);
    if (match) {
      out.push({
        channel: opts.channel,
        shop: opts.shop,
        buyer: opts.buyer,
        // Position + content, so pasting the same conversation twice does not duplicate it.
        id: createHash("sha256").update(`${opts.buyer}|${out.length}|${line.trim()}`).digest("hex").slice(0, 16),
        sender: match[1].toUpperCase() === "S" ? "seller" : "buyer",
        text: match[2],
      });
    } else if (line.trim() && out.length) {
      const last = out[out.length - 1];
      last.text = `${last.text}\n${line}`;
      last.id = createHash("sha256").update(`${last.id}|${line.trim()}`).digest("hex").slice(0, 16);
    } else if (line.trim()) {
      const id = createHash("sha256").update(`${opts.buyer}|0|${line.trim()}`).digest("hex").slice(0, 16);
      out.push({ channel: opts.channel, shop: opts.shop, buyer: opts.buyer, id, sender: "buyer", text: line });
    }
  }
  // Pasted text has no real times. Space messages an hour apart, ending now, so the
  // "several messages in a short time" escalation rule does not fire on pasted history.
  out.forEach((m, i) => (m.at = new Date(base - (out.length - 1 - i) * 3_600_000)));
  return out;
}
