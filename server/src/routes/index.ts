// Controllers: validate input, call a service or repository, shape the response. No SQL here.
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { normalizeMessages, normalizeOrders, parsePastedConversation } from "../channels/manual.js";
import { config } from "../config.js";
import { pool } from "../db/pool.js";
import * as ingestRepo from "../repositories/ingest.js";
import * as jobs from "../repositories/jobs.js";
import * as orders from "../repositories/orders.js";
import * as tickets from "../repositories/tickets.js";
import { ingestMessages, ingestOrders } from "../services/ingest.js";
import { submitReview } from "../services/review.js";

export const api = Router();

// Single shared token until there is real login. Never enable without ADMIN_TOKEN outside local dev.
api.use((req: Request, res: Response, next: NextFunction) => {
  if (!config.adminToken) return next();
  if (req.headers.authorization === `Bearer ${config.adminToken}`) return next();
  res.status(401).json({ error: "unauthorized" });
});

api.get("/tickets", async (req, res) => {
  const status = z.enum(["open", "replied", "all"]).catch("open").parse(req.query.status);
  const statuses = status === "open" ? ["new", "triaged", "error"] : status === "replied" ? ["replied", "closed"] : ["new", "triaged", "replied", "closed", "error"];
  res.json(await tickets.listTickets(pool, statuses));
});

api.get("/tickets/:id", async (req, res) => {
  const ticket = await tickets.getTicket(pool, req.params.id);
  if (!ticket) return void res.status(404).json({ error: "not found" });
  const [messages, draft, order] = await Promise.all([
    ingestRepo.recentMessages(pool, ticket.conversation_id, 50),
    tickets.latestDraft(pool, ticket.id),
    ticket.order_id ? orders.getOrder(pool, ticket.order_id) : null,
  ]);
  res.json({ ticket, messages, draft, order });
});

api.post("/tickets/:id/retriage", async (req, res) => {
  await jobs.enqueueTriage(pool, req.params.id);
  res.status(202).json({ queued: true });
});

api.post("/tickets/:id/close", async (req, res) => {
  await tickets.setTicketStatus(pool, req.params.id, "closed");
  await tickets.audit(pool, "mom", "ticket.close", req.params.id);
  res.json({ ok: true });
});

const reviewBody = z.object({ draftId: z.string().uuid(), finalText: z.string().min(1), reason: z.string().nullish() });
api.post("/reviews", async (req, res) => {
  const body = reviewBody.parse(req.body);
  res.status(201).json(await submitReview({ ...body, actor: "mom" }));
});

// Manual import: JSON array of messages, or a pasted conversation.
const pasteBody = z.object({
  channel: z.enum(["shopee", "tiktok", "manual"]),
  buyer: z.string().min(1),
  text: z.string().min(1),
  shop: z.string().optional(),
});
api.post("/import/messages", async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : parsePastedConversation(pasteBody.parse(req.body));
  res.status(201).json(await ingestMessages(normalizeMessages(rows), "import"));
});

api.post("/import/orders", async (req, res) => {
  const rows = z.array(z.unknown()).parse(req.body);
  res.status(201).json({ upserted: await ingestOrders(normalizeOrders(rows)) });
});

api.get("/policies", async (_req, res) => {
  res.json(await orders.listPolicies(pool));
});

const policyBody = z.object({ scope: z.enum(["shop", "shopee", "tiktok"]), topic: z.string().min(1), text: z.string().min(1) });
api.post("/policies", async (req, res) => {
  const policy = await orders.insertPolicy(pool, policyBody.parse(req.body));
  await tickets.audit(pool, "mom", "policy.create", policy.id, { topic: policy.topic, version: policy.version });
  res.status(201).json(policy);
});

// Weekly numbers for docs/05 and docs/07: acceptance, edits, cost, over-promise flags.
api.get("/stats", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*) FROM tickets)::int AS tickets,
      (SELECT count(*) FROM tickets WHERE status IN ('new','triaged'))::int AS open,
      (SELECT count(*) FROM reviews)::int AS reviews,
      (SELECT round(avg(accepted::int)::numeric, 3) FROM reviews) AS acceptance_rate,
      (SELECT round(avg(edit_ratio)::numeric, 3) FROM reviews) AS avg_edit_ratio,
      (SELECT count(*) FROM drafts WHERE 'possible_overpromise' = ANY(safety_flags))::int AS flagged_overpromise,
      (SELECT round(avg(cost)::numeric, 6) FROM drafts) AS avg_cost_per_draft,
      (SELECT count(*) FROM ingestion_events WHERE kind = 'duplicate')::int AS duplicates_caught,
      (SELECT count(*) FROM jobs WHERE status = 'failed')::int AS failed_jobs`);
  res.json(rows[0]);
});

// Error handler: validation errors are 400, anything else 500 without leaking internals.
api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return void res.status(400).json({ error: "invalid input", issues: err.issues });
  console.error(err);
  res.status(500).json({ error: "internal error" });
});
