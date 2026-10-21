// Triage worker: polls the job table and runs the pipeline. Run one or more; SKIP LOCKED keeps them apart.
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { createLLM } from "./llm/index.js";
import * as jobs from "./repositories/jobs.js";
import * as tickets from "./repositories/tickets.js";
import { triageTicket } from "./services/triage.js";

const llm = createLLM();
let stopping = false;

/** Process one job. Returns false when the queue is empty. */
export async function runOnce(): Promise<boolean> {
  const job = await jobs.claimJob(pool);
  if (!job) return false;
  try {
    const out = await triageTicket(pool, llm, job.payload.ticketId);
    await jobs.completeJob(pool, job.id);
    console.log(`triaged ${out.ticketId} ${out.category} ${out.priority} drafted=${out.drafted} cost=$${out.cost.toFixed(5)}`);
  } catch (err) {
    const message = (err as Error).message;
    const retrying = await jobs.failJob(pool, job, message);
    if (!retrying) await tickets.setTicketStatus(pool, job.payload.ticketId, "error");
    console.error(`job ${job.id} failed (attempt ${job.attempts}, retrying=${retrying}): ${message}`);
  }
  return true;
}

async function loop() {
  console.log(`worker started: provider=${config.llmProvider} model=${llm.model}`);
  while (!stopping) {
    const worked = await runOnce().catch((err) => (console.error(err), false));
    if (!worked) await new Promise((r) => setTimeout(r, config.workerPollMs));
  }
  await pool.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.on("SIGTERM", () => (stopping = true));
  process.on("SIGINT", () => (stopping = true));
  void loop();
}
