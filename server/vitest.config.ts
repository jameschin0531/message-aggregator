import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration tests share one database, so run files one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/triage_test",
      LLM_PROVIDER: "fake",
      ADMIN_TOKEN: "",
    },
  },
});
