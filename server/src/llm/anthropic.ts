import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { CLASSIFY_SYSTEM, DRAFT_SYSTEM, draftUserPrompt } from "./prompts.js";
import {
  classificationSchema,
  costOf,
  draftSchema,
  renderConversation,
  type Classification,
  type ConversationTurn,
  type DraftInput,
  type DraftOutput,
  type TriageLLM,
  type Usage,
} from "./types.js";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

// Models that accept the server-side refusal fallback (fallbacks: "default").
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

export class AnthropicTriageLLM implements TriageLLM {
  private client = new Anthropic(); // ANTHROPIC_API_KEY from the environment

  constructor(
    readonly model: string,
    private effort: Effort,
  ) {}

  private async call<T>(system: string, user: string, schema: z.ZodType<T>, maxTokens: number): Promise<{ result: T; usage: Usage }> {
    const started = Date.now();
    const fallback = FALLBACK_MODELS.has(this.model);
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: this.effort, format: betaZodOutputFormat(schema) },
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    if (response.stop_reason === "refusal") {
      throw new Error(`Model refused (${response.stop_details?.category ?? "unknown"})`);
    }
    if (response.stop_reason === "max_tokens") throw new Error("Model output hit max_tokens");
    if (!response.parsed_output) throw new Error("Model output did not match the schema");

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    return {
      result: response.parsed_output,
      usage: {
        model: response.model,
        inputTokens,
        outputTokens,
        cost: costOf(response.model, inputTokens, outputTokens),
        latencyMs: Date.now() - started,
      },
    };
  }

  classify(conversation: ConversationTurn[]): Promise<{ result: Classification; usage: Usage }> {
    return this.call(CLASSIFY_SYSTEM, `CONVERSATION:\n${renderConversation(conversation)}`, classificationSchema, 4000);
  }

  draft(input: DraftInput): Promise<{ result: DraftOutput; usage: Usage }> {
    const order = input.order
      ? JSON.stringify(input.order, null, 2)
      : input.candidateOrders.length
        ? `Several possible orders: ${input.candidateOrders.join(", ")}. Ask which one.`
        : "No matching order found.";
    const policies = input.policies.length
      ? input.policies.map((p) => `[${p.topic} v${p.version}] ${p.text}`).join("\n")
      : "No policy on file for this topic. Do not state any policy terms.";
    const user = draftUserPrompt(renderConversation(input.conversation), input.classification.summary, order, policies);
    return this.call(DRAFT_SYSTEM, user, draftSchema, 8000);
  }
}
