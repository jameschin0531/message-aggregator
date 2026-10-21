// The triage pipeline for one ticket (docs/02 message flow):
// classify -> match order -> set priority -> look up policy -> draft -> safety check.
import type { Db } from "../db/pool.js";
import { PROMPT_VERSION, type ConversationTurn, type TriageLLM } from "../llm/types.js";
import * as ingestRepo from "../repositories/ingest.js";
import * as orders from "../repositories/orders.js";
import * as tickets from "../repositories/tickets.js";
import { collectOrderRefs, decide } from "../triage/decide.js";
import { checkDraft } from "../triage/safety.js";
import { POLICY_TOPICS_BY_CATEGORY } from "../triage/taxonomy.js";

export interface TriageOutcome {
  ticketId: string;
  category: string;
  priority: string;
  drafted: boolean;
  cost: number;
}

export async function triageTicket(db: Db, llm: TriageLLM, ticketId: string, now = new Date()): Promise<TriageOutcome> {
  const ticket = await tickets.getTicket(db, ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  const history = await ingestRepo.recentMessages(db, ticket.conversation_id);
  const turns: ConversationTurn[] = history.map((m) => ({ sender: m.sender_type, type: m.message_type, text: m.text }));
  const buyerMessages = history.filter((m) => m.sender_type === "buyer");
  if (!buyerMessages.length) throw new Error(`Ticket ${ticketId} has no buyer message`);

  // 1. Classify (language, category, order ref, tone).
  const { result: cls, usage: clsUsage } = await llm.classify(turns);

  // 2. Match the order (regex + model reading, checked against the orders table), 3. decide priority in code.
  const buyer = buyerMessages.map((m) => ({ text: m.text, type: m.message_type, at: m.created_at_channel }));
  const refs = collectOrderRefs(buyer, cls);
  const matched = await orders.findOrdersByRefs(db, ticket.shop_id, refs);
  const { order, candidates, needsHuman, priority, reasons } = decide({
    cls,
    buyerMessages: buyer,
    matched,
    facts: (o) => ({ status: o.status, shippedAt: o.shipped_at, promisedDeliveryAt: o.promised_delivery_at }),
    now,
  });

  await tickets.saveTriage(db, ticketId, {
    category: cls.category,
    priority,
    priorityReasons: reasons,
    language: cls.language,
    orderId: order?.id ?? null,
    extractedOrderRef: refs[0] ?? null,
    needsHuman,
  });

  // 4. Draft, only when the system is confident. Otherwise Mom handles it (docs/04: no confident draft on low confidence).
  if (needsHuman) {
    return { ticketId, category: cls.category, priority, drafted: false, cost: clsUsage.cost };
  }

  const policies = await orders.currentPolicies(db, ticket.channel, POLICY_TOPICS_BY_CATEGORY[cls.category]);
  const { result: draft, usage: draftUsage } = await llm.draft({
    conversation: turns,
    classification: cls,
    order: order
      ? {
          channel_order_id: order.channel_order_id,
          status: order.status,
          items: order.items,
          tracking_no: order.tracking_no,
          shipped_at: order.shipped_at?.toISOString() ?? null,
          delivered_at: order.delivered_at?.toISOString() ?? null,
          promised_delivery_at: order.promised_delivery_at?.toISOString() ?? null,
        }
      : null,
    candidateOrders: candidates.map((o) => o.channel_order_id),
    policies,
  });

  // 5. Safety: flag promises so Mom sees them highlighted.
  const safetyFlags = checkDraft(draft.reply);
  if (draft.needs_mom_decision) safetyFlags.push("needs_mom_decision");
  const usedTopics = new Set(draft.policy_topics_used);
  const unknownTopics = draft.policy_topics_used.filter((t) => !policies.some((p) => p.topic === t));
  if (unknownTopics.length) safetyFlags.push("cites_unknown_policy");

  await tickets.insertDraft(db, {
    ticketId,
    text: draft.reply,
    policyRefs: policies.filter((p) => usedTopics.has(p.topic)).map((p) => ({ id: p.id, topic: p.topic, version: p.version })),
    safetyFlags,
    model: draftUsage.model,
    promptVersion: PROMPT_VERSION,
    inputTokens: clsUsage.inputTokens + draftUsage.inputTokens,
    outputTokens: clsUsage.outputTokens + draftUsage.outputTokens,
    cost: clsUsage.cost + draftUsage.cost,
    latencyMs: clsUsage.latencyMs + draftUsage.latencyMs,
  });

  return { ticketId, category: cls.category, priority, drafted: true, cost: clsUsage.cost + draftUsage.cost };
}
