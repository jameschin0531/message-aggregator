// All configuration comes from environment variables. Secrets never go in the repository.
function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(env("PORT", "3000")),
  databaseUrl: env("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/triage"),
  // Shared secret for the inbox until real login exists. Empty = no auth (local dev only).
  adminToken: env("ADMIN_TOKEN", ""),
  // 'anthropic' calls the Claude API; 'fake' is a deterministic rule-based stand-in for tests, CI and offline work.
  llmProvider: env("LLM_PROVIDER", "fake") as "anthropic" | "fake",
  // Haiku first, Sonnet only if evaluation says it is not enough (docs/11-decision-log.md).
  llmModel: env("LLM_MODEL", "claude-haiku-5-5"),
  // Low effort for classification (docs/06 cost controls); compare low/medium/high in the effort experiment.
  llmEffort: env("LLM_EFFORT", "low") as "low" | "medium" | "high" | "xhigh" | "max",
  // 32-byte key, base64. Encrypts platform OAuth tokens at rest (Phase B).
  tokenEncKey: env("TOKEN_ENC_KEY", ""),
  workerPollMs: Number(env("WORKER_POLL_MS", "1000")),
};
