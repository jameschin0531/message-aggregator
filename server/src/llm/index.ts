import { config } from "../config.js";
import { AnthropicTriageLLM } from "./anthropic.js";
import { FakeTriageLLM } from "./fake.js";
import type { TriageLLM } from "./types.js";

export function createLLM(provider = config.llmProvider, model = config.llmModel, effort = config.llmEffort): TriageLLM {
  return provider === "anthropic" ? new AnthropicTriageLLM(model, effort) : new FakeTriageLLM();
}
