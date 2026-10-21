// Categories and default priorities from docs/04-triage-rules.md ([Proposed]; validate on Mom's real messages).
export const CATEGORIES = [
  "return_refund", // wants money back or to return / exchange an item
  "shipping", // parcel not received, tracking, delivery time
  "item_problem", // damaged, wrong item, missing item
  "charged_no_order", // paid but no order found
  "complaint_threat", // threatens a bad review or platform complaint, aggressive tone
  "cancel_order", // wants to cancel before shipping
  "product_question", // pre-purchase size or spec question
  "other", // cannot be classified; leave to Mom
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LANGUAGES = ["zh", "en", "ms", "mixed"] as const;
export type Language = (typeof LANGUAGES)[number];

// P1 = high, P2 = medium, P3 = low
export const PRIORITIES = ["P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DEFAULT_PRIORITY: Record<Category, Priority> = {
  return_refund: "P2",
  shipping: "P2",
  item_problem: "P1",
  charged_no_order: "P1",
  complaint_threat: "P1",
  cancel_order: "P2",
  product_question: "P3",
  other: "P3",
};

export const POLICY_TOPICS_BY_CATEGORY: Record<Category, string[]> = {
  return_refund: ["returns", "refunds", "exchange"],
  shipping: ["shipping", "delivery"],
  item_problem: ["item_problem", "returns", "refunds"],
  charged_no_order: ["payment"],
  complaint_threat: ["returns", "refunds", "shipping"],
  cancel_order: ["cancellation"],
  product_question: ["product_info"],
  other: [],
};
