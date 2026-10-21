// Integration: import -> dedupe -> worker -> triaged ticket with draft -> review, against a real Postgres.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { migrate } from "../src/db/migrate.js";
import { pool } from "../src/db/pool.js";
import { runOnce } from "../src/worker.js";

const app = createApp();

beforeAll(async () => {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await migrate();
});
afterAll(() => pool.end());

async function drainQueue() {
  while (await runOnce()) {}
}

describe("manual import to reviewed reply", () => {
  it("imports orders and policies", async () => {
    await request(app)
      .post("/api/import/orders")
      .send([{ channel: "shopee", order_id: "241005ZXCV9012", items: [{ name: "Knit top", qty: 1 }], status: "delivered", created_at: "2026-10-05T05:00:00Z" }])
      .expect(201);
    await request(app).post("/api/policies").send({ scope: "shop", topic: "returns", text: "Returns within 7 days." }).expect(201);
    const second = await request(app).post("/api/policies").send({ scope: "shop", topic: "returns", text: "Returns within 14 days." }).expect(201);
    expect(second.body.version).toBe(2);
  });

  it("stores messages once and queues one triage job per conversation", async () => {
    const batch = [
      { channel: "shopee", buyer: "Ali", id: "m1", text: "Can I return? order 241005ZXCV9012", at: new Date().toISOString() },
      { channel: "shopee", buyer: "Ali", id: "m2", text: "It doesn't fit", at: new Date().toISOString() },
    ];
    const first = await request(app).post("/api/import/messages").send(batch).expect(201);
    expect(first.body).toEqual({ stored: 2, duplicates: 0, ticketsQueued: 1 });
    const again = await request(app).post("/api/import/messages").send(batch).expect(201);
    expect(again.body.duplicates).toBe(2);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM jobs WHERE status = 'queued'");
    expect(rows[0].n).toBe(1);
  });

  it("triages, matches the order, drafts with the latest policy, and records the review", async () => {
    await drainQueue();
    const list = await request(app).get("/api/tickets").expect(200);
    expect(list.body).toHaveLength(1);
    const ticket = list.body[0];
    expect(ticket).toMatchObject({ status: "triaged", category: "return_refund", priority: "P2", language: "en" });
    expect(ticket.preview).not.toContain("Ali");

    const detail = await request(app).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(detail.body.order.channel_order_id).toBe("241005ZXCV9012");
    expect(detail.body.draft.policy_refs).toContainEqual(expect.objectContaining({ topic: "returns", version: 2 }));
    expect(detail.body.draft.safety_flags).toContain("needs_mom_decision");

    const review = await request(app)
      .post("/api/reviews")
      .send({ draftId: detail.body.draft.id, finalText: detail.body.draft.text })
      .expect(201);
    expect(review.body).toMatchObject({ editRatio: 0, accepted: true });
    const after = await request(app).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(after.body.ticket.status).toBe("replied");
  });

  it("does not draft for a non-text message; Mom handles it", async () => {
    await request(app)
      .post("/api/import/messages")
      .send([{ channel: "tiktok", buyer: "Mei", id: "img1", type: "image", text: null }])
      .expect(201);
    await drainQueue();
    const list = await request(app).get("/api/tickets").expect(200);
    const t = list.body.find((x: { channel: string }) => x.channel === "tiktok");
    expect(t.needs_human).toBe(true);
    const detail = await request(app).get(`/api/tickets/${t.id}`).expect(200);
    expect(detail.body.draft).toBeNull();
  });

  it("ignores seller and system messages for triage", async () => {
    const res = await request(app)
      .post("/api/import/messages")
      .send([{ channel: "shopee", buyer: "Tan", id: "sys1", sender: "system", text: "Order has been shipped" }])
      .expect(201);
    expect(res.body.ticketsQueued).toBe(0);
  });

  it("rejects bad input with 400", async () => {
    await request(app).post("/api/policies").send({ scope: "nowhere" }).expect(400);
  });
});
