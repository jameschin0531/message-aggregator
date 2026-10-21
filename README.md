# message-aggregator

After-sales message triage for a small Malaysian online shop selling on Shopee and TikTok Shop.
It takes buyer messages, detects language, classifies the request, matches the order, sets a priority with
readable reasons, and drafts a reply in the buyer's language from the shop's own policy table.
**The owner reviews every draft and sends it herself.** The system never talks to a buyer.

Status: Phase A (manual import) works end to end. Phase B (Shopee / TikTok Shop API intake) waits on platform approval.
Planning documents (00–13) belong in `docs/`; Week 0 material for Mom is in `docs/week-0/`.

## What is in here

```
server/                 Node + TypeScript API, triage worker, eval runner
  src/channels/         Adapter interface; manual import (works today); Shopee/TikTok stubs (Phase B)
  src/triage/           Pure rules: language, order-ID regex, priority, draft safety check, shared decide()
  src/llm/              Claude client (structured output), prompts (versioned), rule-based "fake" provider
  src/repositories/     SQL only
  src/services/         ingest (dedupe → store → ticket → job), triage pipeline, review
  src/routes/           HTTP controllers
  src/eval/run.ts       Evaluation (docs/05 metrics) → markdown report
  src/db/migrations/    Schema (docs/03 + jobs table)
  data/synthetic/       Synthetic policies, orders and 36 labelled eval cases. Real data goes in data/real/ (gitignored)
  test/                 Unit tests (rules) + integration test against Postgres
web/                    React inbox: priority-sorted list, conversation, order, editable draft, import, policies, stats
Dockerfile              One image: API serves the built inbox; same image runs the worker
docker-compose.yml      Postgres + API + worker
.github/workflows/ci.yml  Typecheck, tests, rules-only eval, web build, docker build
```

## Run it

```bash
cp .env.example .env
docker compose up --build             # inbox + API on http://localhost:3000
docker compose exec api npm run seed  # optional: synthetic demo conversations
```

Without Docker (needs a local Postgres 16 with databases `triage` and `triage_test`):

```bash
cd server && npm install
npm run seed          # migrate + synthetic data
npm run dev           # API on :3000
npm run worker        # triage worker (separate terminal)
npm test              # unit + integration tests (uses triage_test)
cd ../web && npm install && npm run dev   # inbox on :5173, proxies /api to :3000
```

`LLM_PROVIDER=fake` (the default) uses keyword rules and costs nothing. Set `LLM_PROVIDER=anthropic` and
`ANTHROPIC_API_KEY` to use Claude. The default model is `claude-haiku-5-5`, per docs/11 (Haiku first, Sonnet if needed).

## Evaluation

```bash
cd server
npm run eval                                                   # rules-only baseline, free
LLM_PROVIDER=anthropic npm run eval -- --effort low            # Haiku
LLM_PROVIDER=anthropic npm run eval -- --model claude-sonnet-5-5 --effort low
npm run eval -- --cases data/real/eval-cases.json --save       # real cases, stored in eval_runs/eval_results
```

Each run writes `eval-reports/<time>-<model>.md` with category / priority / order-ID / language accuracy,
missed-urgent rate, accuracy by language, channel and category, cost, latency and every failure.

Rules-only baseline on the 36 synthetic cases (2026-10-21): category 80.6%, priority 80.6%, order ID 100%,
language 91.7%, urgent cases scored as low priority 11.8%. Synthetic, written by hand. It shows the pipeline works,
not how well it works on real messages.

## Design choices (short)

| Choice | Why |
|---|---|
| Priority decided in code, not by the model | Every P1 shows a reason Mom can read; rules are unit-tested |
| Model returns structured output (schema) | No free-text parsing; invalid output fails loudly and is retried |
| Policies versioned in the database; drafts record which version they used | Money answers must be checkable |
| Draft post-check flags promises (refund, replacement, delivery date) in en / ms / zh | Over-promises are the biggest risk (docs/05, 09) |
| No draft when the message is non-text or the model is not confident | docs/04: do not write a confident draft on missing information |
| Unique key on (shop, channel message id); one queued job per ticket | Webhooks repeat; a burst of messages costs one model call |
| Postgres job table with `FOR UPDATE SKIP LOCKED` | One fewer component; workers can scale out |
| Buyer names pseudonymized at import; never stored in raw payloads | docs/09 privacy rules |
| Same `decide()` function used by the worker and the eval runner | Evaluation measures production logic, not a copy |
