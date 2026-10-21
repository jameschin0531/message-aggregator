// One entry point for every source (manual import now, webhooks and catch-up pulls in Phase B):
// dedupe, store, open a ticket, queue triage.
import { withTransaction } from "../db/pool.js";
import type { NormalizedMessage, NormalizedOrder } from "../channels/types.js";
import * as ingestRepo from "../repositories/ingest.js";
import * as jobs from "../repositories/jobs.js";
import * as orders from "../repositories/orders.js";
import * as tickets from "../repositories/tickets.js";

export interface IngestResult {
  stored: number;
  duplicates: number;
  ticketsQueued: number;
}

export async function ingestMessages(
  messages: NormalizedMessage[],
  source: "webhook" | "poll" | "import",
): Promise<IngestResult> {
  return withTransaction(async (db) => {
    const result: IngestResult = { stored: 0, duplicates: 0, ticketsQueued: 0 };
    const ticketsToQueue = new Set<string>();
    // Oldest first, so a seller reply after a buyer message is seen in order.
    const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const m of sorted) {
      const shopId = await ingestRepo.upsertShop(db, m.channel, m.externalShopId);
      const conversationId = await ingestRepo.upsertConversation(db, shopId, m);
      const id = await ingestRepo.insertMessage(db, shopId, conversationId, m);
      if (!id) {
        result.duplicates++;
        await ingestRepo.logIngestionEvent(db, shopId, "duplicate", m.channelMessageId, { source });
        continue;
      }
      result.stored++;
      await ingestRepo.logIngestionEvent(db, shopId, source, m.channelMessageId);
      await ingestRepo.touchSyncState(db, shopId, m.createdAt);

      // Platform system messages are stored but not triaged (docs/04).
      if (m.senderType === "buyer") ticketsToQueue.add(await tickets.openTicketFor(db, conversationId));
    }

    for (const ticketId of ticketsToQueue) await jobs.enqueueTriage(db, ticketId);
    result.ticketsQueued = ticketsToQueue.size;
    return result;
  });
}

export async function ingestOrders(list: NormalizedOrder[]): Promise<number> {
  return withTransaction(async (db) => {
    for (const o of list) {
      const shopId = await ingestRepo.upsertShop(db, o.channel, o.externalShopId);
      await orders.upsertOrder(db, shopId, o);
    }
    return list.length;
  });
}
