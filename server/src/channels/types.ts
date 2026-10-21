// The one message format every source is mapped to. Triage code only ever sees this.
export type Channel = "shopee" | "tiktok" | "manual";

export interface NormalizedMessage {
  channel: Channel;
  externalShopId: string;
  channelConversationId: string;
  channelMessageId: string;
  buyerRef: string; // pseudonym; adapters must not pass buyer names through
  senderType: "buyer" | "seller" | "system";
  messageType: string; // 'text' or a non-text kind (image, video, sticker, order_card, ...)
  text: string | null;
  createdAt: Date;
  raw: unknown;
}

export interface NormalizedOrder {
  channel: Channel;
  externalShopId: string;
  channelOrderId: string;
  sitegiantOrderNo?: string | null;
  items: { sku?: string; name: string; qty: number; variant?: string }[];
  status: "unpaid" | "to_ship" | "shipped" | "delivered" | "cancelled" | "returned";
  trackingNo?: string | null;
  createdAt: Date;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  promisedDeliveryAt?: Date | null;
}

/**
 * One implementation per source. Manual import works today; Shopee and TikTok adapters
 * fill in once the platforms approve API access (Phase B).
 */
export interface ChannelAdapter {
  readonly channel: Channel;
  /** Map a webhook body to messages. Signature verification happens before this. */
  parseWebhook?(body: unknown, headers: Record<string, string | undefined>): NormalizedMessage[];
  /** Pull messages newer than `since` (scheduled catch-up sync). */
  pullMessages?(externalShopId: string, since: Date): Promise<NormalizedMessage[]>;
  pullOrders?(externalShopId: string, since: Date): Promise<NormalizedOrder[]>;
}
