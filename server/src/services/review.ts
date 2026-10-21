// Mom's decision on a draft. Every review is a free evaluation record (docs/03).
import { withTransaction } from "../db/pool.js";
import * as tickets from "../repositories/tickets.js";

/** Normalized word-level edit distance: 0 = unchanged, 1 = fully rewritten. */
export function editRatio(original: string, final: string): number {
  const a = original.trim().split(/\s+|(?=[㐀-鿿])/u).filter(Boolean);
  const b = final.trim().split(/\s+|(?=[㐀-鿿])/u).filter(Boolean);
  if (!a.length && !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Math.min(1, prev[b.length] / Math.max(a.length, b.length));
}

// [Proposed] "lightly edited" threshold for the draft acceptance rate (docs/05).
export const LIGHT_EDIT_MAX = 0.2;

export async function submitReview(input: { draftId: string; finalText: string; reason?: string | null; actor: string }) {
  return withTransaction(async (db) => {
    const draft = await tickets.getDraft(db, input.draftId);
    if (!draft) throw new Error("Draft not found");
    const ratio = editRatio(draft.text, input.finalText);
    const reviewId = await tickets.insertReview(db, {
      draftId: input.draftId,
      finalText: input.finalText,
      accepted: ratio <= LIGHT_EDIT_MAX,
      editRatio: ratio,
      reason: input.reason ?? null,
    });
    await tickets.setTicketStatus(db, draft.ticket_id, "replied");
    await tickets.audit(db, input.actor, "review.submit", draft.ticket_id, { draftId: input.draftId, editRatio: ratio });
    return { reviewId, editRatio: ratio, accepted: ratio <= LIGHT_EDIT_MAX };
  });
}
