// Pure triage decisions shared by the worker and the eval runner, so evaluation scores the production logic.
import type { Classification } from "../llm/types.js";
import { extractOrderRefs } from "./orderRef.js";
import { decidePriority, REPEAT_WINDOW_MINUTES, type OrderFacts } from "./priority.js";
import type { Priority } from "./taxonomy.js";

export interface BuyerMessage {
  text: string | null;
  type: string;
  at: Date;
}

/** Order refs from the regex and from the model's reading, deduplicated. */
export function collectOrderRefs(buyerMessages: BuyerMessage[], cls: Classification): string[] {
  const text = buyerMessages.map((m) => m.text ?? "").join("\n");
  const fromRegex = extractOrderRefs(text).map((r) => r.ref);
  const fromModel = cls.order_ref ? [cls.order_ref.trim().toUpperCase()] : [];
  return [...new Set([...fromRegex, ...fromModel])];
}

export interface Decision<O> {
  order: O | null;
  candidates: O[];
  needsHuman: boolean;
  priority: Priority;
  reasons: string[];
}

export function decide<O>(input: {
  cls: Classification;
  buyerMessages: BuyerMessage[];
  matched: O[];
  facts: (order: O) => OrderFacts;
  now: Date;
}): Decision<O> {
  const { cls, buyerMessages, matched, facts, now } = input;
  const last = buyerMessages.at(-1);
  const order = matched.length === 1 ? matched[0] : null;
  const hasNonText = buyerMessages.some((m) => m.type !== "text");
  const needsHuman = cls.needs_human || !cls.confident || (last !== undefined && last.type !== "text");
  const windowStart = now.getTime() - REPEAT_WINDOW_MINUTES * 60_000;
  const { priority, reasons } = decidePriority({
    category: cls.category,
    text: buyerMessages.map((m) => m.text ?? "").join("\n"),
    buyerUpset: cls.buyer_upset,
    needsHuman,
    hasNonText,
    order: order ? facts(order) : null,
    recentBuyerMessages: buyerMessages.filter((m) => m.at.getTime() >= windowStart).length,
    now,
  });
  if (matched.length > 1) reasons.push(`${matched.length} possible orders: Mom chooses`);
  return { order, candidates: matched.length > 1 ? matched : [], needsHuman, priority, reasons };
}
