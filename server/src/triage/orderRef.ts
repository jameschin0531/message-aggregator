// Find an order number in free text.
// [Unverified] formats — confirm against Mom's real orders and adjust:
//   Shopee order SN: 14 chars, starts with a YYMMDD date, then letters/digits (e.g. 241018KX7P2M4Q)
//   TikTok Shop order ID: 18–19 digits (e.g. 579123456789012345)
const SHOPEE = /\b\d{6}[A-Z0-9]{8}\b/g;
const TIKTOK = /\b\d{18,19}\b/g;

export interface OrderRef {
  ref: string;
  channel: "shopee" | "tiktok";
}

export function extractOrderRefs(text: string): OrderRef[] {
  const upper = text.toUpperCase();
  const refs: OrderRef[] = [];
  for (const m of upper.matchAll(SHOPEE)) {
    if (/[A-Z]/.test(m[0])) refs.push({ ref: m[0], channel: "shopee" });
  }
  for (const m of text.matchAll(TIKTOK)) refs.push({ ref: m[0], channel: "tiktok" });
  return refs;
}
