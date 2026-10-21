// Loads the SYNTHETIC policies, orders and a few demo conversations into Postgres, so the inbox has something to show.
//   npm run seed
import { readFile } from "node:fs/promises";
import { normalizeMessages, normalizeOrders } from "../channels/manual.js";
import { migrate } from "../db/migrate.js";
import { pool } from "../db/pool.js";
import * as orders from "../repositories/orders.js";
import { ingestMessages, ingestOrders } from "../services/ingest.js";

const dir = "data/synthetic";

async function main() {
  await migrate();

  const existing = await orders.listPolicies(pool);
  if (!existing.length) {
    const policies: { scope: string; topic: string; text: string }[] = JSON.parse(await readFile(`${dir}/policies.json`, "utf8"));
    for (const p of policies) await orders.insertPolicy(pool, p);
    console.log(`policies: ${policies.length}`);
  }

  console.log(`orders: ${await ingestOrders(normalizeOrders(JSON.parse(await readFile(`${dir}/orders.json`, "utf8"))))}`);

  // Every eval case becomes a demo conversation, timed relative to now.
  const { cases } = JSON.parse(await readFile(`${dir}/eval-cases.json`, "utf8"));
  const rows = cases.flatMap((c: { id: string; channel: string; messages: { sender?: string; type?: string; text: string | null; minutes_ago?: number }[] }) =>
    c.messages.map((m, i) => ({
      channel: c.channel,
      buyer: `demo-${c.id}`,
      conversation: `demo-${c.id}`,
      id: `demo-${c.id}-${i}`,
      sender: m.sender ?? "buyer",
      type: m.type ?? "text",
      text: m.text,
      at: new Date(Date.now() - (m.minutes_ago ?? 1) * 60_000),
    })),
  );
  console.log("messages:", await ingestMessages(normalizeMessages(rows), "import"));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
