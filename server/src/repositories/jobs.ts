// The job table is the queue (docs/11: "job table in Postgres instead of a queue").
import type { Db } from "../db/pool.js";

export const MAX_ATTEMPTS = 3;

export async function enqueueTriage(db: Db, ticketId: string): Promise<void> {
  // At most one queued triage job per ticket: a burst of buyer messages triggers one model call.
  await db.query(
    `INSERT INTO jobs (kind, payload)
     SELECT 'triage', jsonb_build_object('ticketId', $1::text)
     WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE kind = 'triage' AND status = 'queued' AND payload->>'ticketId' = $1::text)`,
    [ticketId],
  );
}

export interface Job {
  id: string;
  kind: string;
  payload: { ticketId: string };
  attempts: number;
}

/** Claim one ready job. SKIP LOCKED lets several workers run without taking the same job. */
export async function claimJob(db: Db): Promise<Job | null> {
  const { rows } = await db.query(
    `UPDATE jobs SET status = 'running', attempts = attempts + 1, updated_at = now()
     WHERE id = (
       SELECT id FROM jobs WHERE status = 'queued' AND run_after <= now()
       ORDER BY run_after FOR UPDATE SKIP LOCKED LIMIT 1
     )
     RETURNING id, kind, payload, attempts`,
  );
  return rows[0] ?? null;
}

export async function completeJob(db: Db, id: string): Promise<void> {
  await db.query(`UPDATE jobs SET status = 'done', updated_at = now() WHERE id = $1`, [id]);
}

/** Retry with backoff (30s, 2m) until MAX_ATTEMPTS, then mark failed. Returns true if it will retry. */
export async function failJob(db: Db, job: Job, error: string): Promise<boolean> {
  const retry = job.attempts < MAX_ATTEMPTS;
  await db.query(
    `UPDATE jobs SET status = $2, last_error = $3, run_after = now() + ($4 || ' seconds')::interval, updated_at = now()
     WHERE id = $1`,
    [job.id, retry ? "queued" : "failed", error.slice(0, 2000), String(30 * 4 ** (job.attempts - 1))],
  );
  return retry;
}
