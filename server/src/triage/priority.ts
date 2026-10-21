// Priority is decided in code, not by the model, so every P1 has a reason Mom can read and a rule we can test.
// Rules from docs/04-triage-rules.md (default priority per category + escalation rules).
import { DEFAULT_PRIORITY, type Category, type Priority } from "./taxonomy.js";

export interface OrderFacts {
  status: "unpaid" | "to_ship" | "shipped" | "delivered" | "cancelled" | "returned";
  shippedAt?: Date | null;
  promisedDeliveryAt?: Date | null;
}

export interface PriorityInput {
  category: Category;
  text: string; // buyer text of the open ticket
  buyerUpset: boolean;
  needsHuman: boolean;
  hasNonText?: boolean; // the buyer sent an image, video, sticker or card
  order: OrderFacts | null;
  recentBuyerMessages: number; // buyer messages in the last REPEAT_WINDOW_MINUTES
  now?: Date;
}

// Complaint, bad review, lawyer or police, in en / ms / zh. [Proposed]; extend from real conversations.
const ESCALATION =
  /\b(report(ed|ing)?|complain(t|ts|ed)?|scam(mer)?|cheat(er|ing)?|fraud|1[ -]?star|bad review|lawyer|police|lapor|aduan|tipu|penipu|tertipu|polis|peguam|tribunal)\b|投诉|举报|差评|骗子|骗人|律师|报警|警察/i;

export const LATE_SHIPPED_DAYS = 7; // used when the order has no promised date. [Open] set from real delivery times
export const REPEAT_WINDOW_MINUTES = 30;
export const REPEAT_THRESHOLD = 3;

const RAISE: Record<Priority, Priority> = { P1: "P1", P2: "P1", P3: "P2" };

export function decidePriority(input: PriorityInput): { priority: Priority; reasons: string[] } {
  const now = input.now ?? new Date();
  const p1: string[] = [];

  if (ESCALATION.test(input.text)) p1.push("Mentions a complaint, bad review, lawyer or police");
  if (input.category === "complaint_threat") p1.push("Threat of bad review or platform complaint");
  if (input.category === "item_problem") p1.push("Damaged, wrong or missing item");
  if (input.category === "charged_no_order") p1.push("Charged but no order");
  if (input.category === "return_refund" && input.buyerUpset) p1.push("Refund or return, and the buyer is upset");
  if (input.category === "shipping" && input.order?.status === "shipped") {
    const promised = input.order.promisedDeliveryAt;
    const shipped = input.order.shippedAt;
    if (promised && now > promised) p1.push("Past the promised delivery date");
    else if (!promised && shipped) {
      const days = (now.getTime() - shipped.getTime()) / 86_400_000;
      if (days > LATE_SHIPPED_DAYS) p1.push(`Shipped ${Math.floor(days)} days ago and not delivered`);
    }
  }
  if (p1.length) return { priority: "P1", reasons: p1 };

  let priority = DEFAULT_PRIORITY[input.category];
  const reasons = [`Default for ${input.category.replace(/_/g, " ")}`];
  if (input.recentBuyerMessages >= REPEAT_THRESHOLD) {
    priority = RAISE[priority];
    reasons.push(`Buyer sent ${input.recentBuyerMessages} messages in ${REPEAT_WINDOW_MINUTES} minutes`);
  }
  if (input.hasNonText && priority === "P3") {
    // A photo is often evidence of a damaged or wrong item, which the text alone cannot show.
    priority = "P2";
    reasons.push("Buyer sent a photo or other non-text message");
  }
  if (input.needsHuman) reasons.push("Needs a person to look");
  return { priority, reasons };
}
