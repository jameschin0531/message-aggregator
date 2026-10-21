import { z } from "zod";
import { CATEGORIES, LANGUAGES } from "../triage/taxonomy.js";

export const PROMPT_VERSION = "v1";

export const classificationSchema = z.object({
  language: z.enum(LANGUAGES).describe("Language of the buyer's messages; 'mixed' when they mix languages"),
  category: z.enum(CATEGORIES),
  order_ref: z.string().nullable().describe("Order number exactly as the buyer wrote it, or null"),
  buyer_upset: z.boolean().describe("True if the buyer is angry, threatening, or very frustrated"),
  needs_human: z.boolean().describe("True if the request cannot be understood from text alone, depends on an image, or is outside the categories"),
  confident: z.boolean().describe("False if the category or order number is a guess"),
  summary: z.string().describe("One short English sentence: what the buyer wants"),
});
export type Classification = z.infer<typeof classificationSchema>;

export const draftSchema = z.object({
  reply: z.string().describe("The reply to the buyer, in the buyer's language"),
  policy_topics_used: z.array(z.string()).describe("Topics of the shop policies the reply relies on"),
  needs_mom_decision: z.boolean().describe("True if the case needs a refund, compensation or exception decision"),
});
export type DraftOutput = z.infer<typeof draftSchema>;

export interface ConversationTurn {
  sender: "buyer" | "seller" | "system";
  type: string;
  text: string | null;
}

export interface DraftOrder {
  channel_order_id: string;
  status: string;
  items: unknown;
  tracking_no: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  promised_delivery_at: string | null;
}

export interface DraftInput {
  conversation: ConversationTurn[];
  classification: Classification;
  order: DraftOrder | null;
  candidateOrders: string[]; // several possible orders: list them, let Mom choose
  policies: { topic: string; version: number; text: string }[];
}

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number; // USD
  latencyMs: number;
}

export interface TriageLLM {
  readonly model: string;
  classify(conversation: ConversationTurn[]): Promise<{ result: Classification; usage: Usage }>;
  draft(input: DraftInput): Promise<{ result: DraftOutput; usage: Usage }>;
}

// USD per million tokens [input, output]. Source: Anthropic pricing as of 2026-10-06; re-check in docs/06-cost-estimate.md.
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export function costOf(model: string, inputTokens: number, outputTokens: number): number {
  const [inp, out] = PRICES[model] ?? [0, 0];
  return (inputTokens * inp + outputTokens * out) / 1_000_000;
}

export function renderConversation(turns: ConversationTurn[]): string {
  return turns
    .map((t) => {
      const who = t.sender === "buyer" ? "BUYER" : t.sender === "seller" ? "SELLER" : "SYSTEM";
      const body = t.type === "text" ? (t.text ?? "") : `[${t.type}${t.text ? `: ${t.text}` : ""}]`;
      return `${who}: ${body}`;
    })
    .join("\n");
}
