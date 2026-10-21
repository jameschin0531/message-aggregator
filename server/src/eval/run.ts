// Eval runner (docs/05). Scores classification, order matching and priority with the same code the worker uses.
//
//   npm run eval                                        # fake provider on the synthetic set (no API cost)
//   LLM_PROVIDER=anthropic npm run eval -- --model claude-haiku-5-5 --effort low
//   npm run eval -- --cases data/real/eval-cases.json   # real cases stay local (data/real is gitignored)
//   npm run eval -- --save                              # also write eval_runs / eval_results to Postgres
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { normalizeOrders } from "../channels/manual.js";
import type { NormalizedOrder } from "../channels/types.js";
import { config } from "../config.js";
import { createLLM } from "../llm/index.js";
import { PROMPT_VERSION, type ConversationTurn } from "../llm/types.js";
import { collectOrderRefs, decide } from "../triage/decide.js";
import { CATEGORIES, LANGUAGES, PRIORITIES } from "../triage/taxonomy.js";

const caseFileSchema = z.object({
  now: z.coerce.date(),
  cases: z.array(
    z.object({
      id: z.string(),
      channel: z.enum(["shopee", "tiktok"]),
      messages: z.array(
        z.object({
          sender: z.enum(["buyer", "seller", "system"]).default("buyer"),
          type: z.string().default("text"),
          text: z.string().nullable(),
          minutes_ago: z.number().default(1),
        }),
      ),
      gold: z.object({
        category: z.enum(CATEGORIES),
        priority: z.enum(PRIORITIES),
        order_id: z.string().nullable(),
        language: z.enum(LANGUAGES),
      }),
      tags: z.array(z.string()).default([]),
      source: z.enum(["real", "synthetic"]).default("synthetic"),
    }),
  ),
});
type EvalCase = z.infer<typeof caseFileSchema>["cases"][number];

interface CaseResult {
  case: EvalCase;
  predicted: { category: string; priority: string; order_id: string | null; language: string; needs_human: boolean };
  correct: { category: boolean; priority: boolean; order_id: boolean; language: boolean };
  cost: number;
  latencyMs: number;
  error?: string;
}

function matchOrders(orders: NormalizedOrder[], refs: string[]): NormalizedOrder[] {
  const wanted = new Set(refs.map((r) => r.toUpperCase()));
  return orders.filter((o) => wanted.has(o.channelOrderId.toUpperCase()) || (o.sitegiantOrderNo && wanted.has(o.sitegiantOrderNo.toUpperCase())));
}

async function runCase(c: EvalCase, now: Date, orders: NormalizedOrder[], llm: ReturnType<typeof createLLM>): Promise<CaseResult> {
  const turns: ConversationTurn[] = c.messages.map((m) => ({ sender: m.sender, type: m.type, text: m.text }));
  const buyer = c.messages
    .filter((m) => m.sender === "buyer")
    .map((m) => ({ text: m.text, type: m.type, at: new Date(now.getTime() - m.minutes_ago * 60_000) }));
  try {
    const { result: cls, usage } = await llm.classify(turns);
    const matched = matchOrders(orders, collectOrderRefs(buyer, cls));
    const d = decide({
      cls,
      buyerMessages: buyer,
      matched,
      facts: (o) => ({ status: o.status, shippedAt: o.shippedAt, promisedDeliveryAt: o.promisedDeliveryAt }),
      now,
    });
    const predicted = {
      category: cls.category,
      priority: d.priority,
      order_id: d.order?.channelOrderId ?? null,
      language: cls.language,
      needs_human: d.needsHuman,
    };
    return {
      case: c,
      predicted,
      correct: {
        category: predicted.category === c.gold.category,
        priority: predicted.priority === c.gold.priority,
        order_id: predicted.order_id === c.gold.order_id,
        language: predicted.language === c.gold.language,
      },
      cost: usage.cost,
      latencyMs: usage.latencyMs,
    };
  } catch (err) {
    return {
      case: c,
      predicted: { category: "error", priority: "error", order_id: null, language: "error", needs_human: true },
      correct: { category: false, priority: false, order_id: false, language: false },
      cost: 0,
      latencyMs: 0,
      error: (err as Error).message,
    };
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");

function breakdown(results: CaseResult[], key: (r: CaseResult) => string): string[] {
  const groups = new Map<string, CaseResult[]>();
  for (const r of results) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, rs]) => `| ${k} | ${rs.length} | ${pct(rs.filter((r) => r.correct.category).length, rs.length)} |`);
}

export function summarize(results: CaseResult[]) {
  const n = results.length;
  const urgent = results.filter((r) => r.case.gold.priority === "P1");
  return {
    cases: n,
    categoryAccuracy: results.filter((r) => r.correct.category).length / n,
    priorityAccuracy: results.filter((r) => r.correct.priority).length / n,
    orderIdAccuracy: results.filter((r) => r.correct.order_id).length / n,
    languageAccuracy: results.filter((r) => r.correct.language).length / n,
    // docs/05: urgent messages classified as low priority. Also report urgent messages not marked P1.
    missedUrgentAsLow: urgent.length ? urgent.filter((r) => r.predicted.priority === "P3").length / urgent.length : 0,
    urgentNotP1: urgent.length ? urgent.filter((r) => r.predicted.priority !== "P1").length / urgent.length : 0,
    errors: results.filter((r) => r.error).length,
    totalCost: results.reduce((s, r) => s + r.cost, 0),
    avgLatencyMs: results.reduce((s, r) => s + r.latencyMs, 0) / n,
  };
}

function report(results: CaseResult[], meta: Record<string, string>): string {
  const s = summarize(results);
  const urgent = results.filter((r) => r.case.gold.priority === "P1").length;
  const lines = [
    `# Eval run ${meta.runAt}`,
    "",
    Object.entries(meta).map(([k, v]) => `- ${k}: ${v}`).join("\n"),
    `- cases: ${s.cases} (${results.filter((r) => r.case.source === "real").length} real, ${results.filter((r) => r.case.source === "synthetic").length} synthetic)`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Category accuracy | ${pct(s.categoryAccuracy * s.cases, s.cases)} |`,
    `| Priority accuracy | ${pct(s.priorityAccuracy * s.cases, s.cases)} |`,
    `| Order ID accuracy | ${pct(s.orderIdAccuracy * s.cases, s.cases)} |`,
    `| Language accuracy | ${pct(s.languageAccuracy * s.cases, s.cases)} |`,
    `| Missed urgent (P1 predicted as P3), of ${urgent} | ${pct(s.missedUrgentAsLow * urgent, urgent)} |`,
    `| Urgent not marked P1, of ${urgent} | ${pct(s.urgentNotP1 * urgent, urgent)} |`,
    `| Errors | ${s.errors} |`,
    `| Total cost | $${s.totalCost.toFixed(4)} |`,
    `| Avg latency (classify) | ${Math.round(s.avgLatencyMs)} ms |`,
    "",
    "## Category accuracy by language",
    "",
    "| Language | Cases | Accuracy |",
    "|---|---|---|",
    ...breakdown(results, (r) => r.case.gold.language),
    "",
    "## Category accuracy by channel",
    "",
    "| Channel | Cases | Accuracy |",
    "|---|---|---|",
    ...breakdown(results, (r) => r.case.channel),
    "",
    "## Category accuracy by gold category",
    "",
    "| Category | Cases | Accuracy |",
    "|---|---|---|",
    ...breakdown(results, (r) => r.case.gold.category),
    "",
    "## Failures",
    "",
    "| Case | Tags | Field | Gold | Predicted |",
    "|---|---|---|---|---|",
  ];
  for (const r of results) {
    for (const field of ["category", "priority", "order_id", "language"] as const) {
      if (!r.correct[field]) {
        lines.push(`| ${r.case.id} | ${r.case.tags.join(", ")} | ${field} | ${r.case.gold[field] ?? "none"} | ${r.error ? `error: ${r.error}` : (r.predicted[field] ?? "none")} |`);
      }
    }
  }
  return lines.join("\n") + "\n";
}

async function saveToDb(results: CaseResult[], meta: { model: string; effort: string; notes: string }) {
  const { pool } = await import("../db/pool.js");
  const { migrate } = await import("../db/migrate.js");
  await migrate();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const run = await client.query(
      `INSERT INTO eval_runs (model, prompt_version, effort, notes, summary) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [meta.model, PROMPT_VERSION, meta.effort, meta.notes, JSON.stringify(summarize(results))],
    );
    for (const r of results) {
      const c = await client.query(
        `INSERT INTO eval_cases (external_id, channel, message_text, gold_category, gold_priority, gold_order_id, language, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (external_id) DO UPDATE SET gold_category = EXCLUDED.gold_category, gold_priority = EXCLUDED.gold_priority,
           gold_order_id = EXCLUDED.gold_order_id, language = EXCLUDED.language, message_text = EXCLUDED.message_text
         RETURNING id`,
        [
          r.case.id,
          r.case.channel,
          r.case.messages.map((m) => `${m.sender}: ${m.text ?? `[${m.type}]`}`).join("\n"),
          r.case.gold.category,
          r.case.gold.priority,
          r.case.gold.order_id,
          r.case.gold.language,
          r.case.source,
        ],
      );
      await client.query(
        `INSERT INTO eval_results (run_id, case_id, predicted_category, predicted_priority, predicted_order_id, predicted_language, correct, cost, latency_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [run.rows[0].id, c.rows[0].id, r.predicted.category, r.predicted.priority, r.predicted.order_id, r.predicted.language, JSON.stringify(r.correct), r.cost, r.latencyMs],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      cases: { type: "string", default: "data/synthetic/eval-cases.json" },
      orders: { type: "string", default: "data/synthetic/orders.json" },
      provider: { type: "string", default: config.llmProvider },
      model: { type: "string", default: config.llmModel },
      effort: { type: "string", default: config.llmEffort },
      concurrency: { type: "string", default: "4" },
      limit: { type: "string" },
      notes: { type: "string", default: "" },
      save: { type: "boolean", default: false },
      "min-category-accuracy": { type: "string" },
    },
  });

  const file = caseFileSchema.parse(JSON.parse(await readFile(values.cases, "utf8")));
  const orders = normalizeOrders(JSON.parse(await readFile(values.orders, "utf8")));
  const cases = values.limit ? file.cases.slice(0, Number(values.limit)) : file.cases;
  const llm = createLLM(values.provider as "anthropic" | "fake", values.model, values.effort as typeof config.llmEffort);

  const results = await mapLimit(cases, Number(values.concurrency), (c) => runCase(c, file.now, orders, llm));
  const runAt = new Date().toISOString();
  const md = report(results, {
    runAt,
    provider: values.provider,
    model: llm.model,
    effort: values.provider === "fake" ? "n/a" : values.effort,
    promptVersion: PROMPT_VERSION,
    caseFile: values.cases,
  });

  await mkdir("eval-reports", { recursive: true });
  const out = path.join("eval-reports", `${runAt.replace(/[:.]/g, "-")}-${llm.model}.md`);
  await writeFile(out, md);
  console.log(md);
  console.log(`Report written to ${out}`);

  if (values.save) await saveToDb(results, { model: llm.model, effort: values.effort, notes: values.notes });

  const min = values["min-category-accuracy"];
  if (min && summarize(results).categoryAccuracy < Number(min)) {
    console.error(`Category accuracy below ${min}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
