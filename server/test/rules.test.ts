import { describe, expect, it } from "vitest";
import { normalizeMessages, parsePastedConversation, pseudonymize } from "../src/channels/manual.js";
import { detectLanguage } from "../src/triage/language.js";
import { extractOrderRefs } from "../src/triage/orderRef.js";
import { decidePriority, type PriorityInput } from "../src/triage/priority.js";
import { checkDraft } from "../src/triage/safety.js";
import { editRatio } from "../src/services/review.js";

describe("detectLanguage", () => {
  it.each([
    ["Where is my parcel? Still not received", "en"],
    ["Barang saya bila sampai? Dah seminggu", "ms"],
    ["我的订单什么时候到？", "zh"],
    ["Hi 这件 dress ada size M tak?", "mixed"],
  ])("%s -> %s", (text, lang) => expect(detectLanguage(text)).toBe(lang));
});

describe("extractOrderRefs", () => {
  it("finds Shopee and TikTok style ids", () => {
    expect(extractOrderRefs("order 241019kx7p2m4q and 579123456789012345")).toEqual([
      { ref: "241019KX7P2M4Q", channel: "shopee" },
      { ref: "579123456789012345", channel: "tiktok" },
    ]);
  });
  it("ignores phone numbers and digit-only 14-char strings", () => {
    expect(extractOrderRefs("call me 0123456789 or 20261021123456")).toEqual([]);
  });
});

describe("decidePriority", () => {
  const now = new Date("2026-10-21T04:00:00Z");
  const base: PriorityInput = { category: "product_question", text: "", buyerUpset: false, needsHuman: false, order: null, recentBuyerMessages: 1, now };

  it("uses the category default", () => {
    expect(decidePriority(base).priority).toBe("P3");
    expect(decidePriority({ ...base, category: "cancel_order" }).priority).toBe("P2");
    expect(decidePriority({ ...base, category: "item_problem" }).priority).toBe("P1");
  });
  it("escalates complaints, bad reviews, lawyers and police in any language", () => {
    for (const text of ["I will report you", "nanti saya lapor polis", "再这样我就给差评", "my lawyer will contact you"]) {
      expect(decidePriority({ ...base, text }).priority).toBe("P1");
    }
  });
  it("escalates a refund only when the buyer is upset", () => {
    expect(decidePriority({ ...base, category: "return_refund" }).priority).toBe("P2");
    expect(decidePriority({ ...base, category: "return_refund", buyerUpset: true }).priority).toBe("P1");
  });
  it("escalates shipping past the promised date, or long after shipping without one", () => {
    const shipping = { ...base, category: "shipping" as const };
    expect(decidePriority({ ...shipping, order: { status: "shipped", promisedDeliveryAt: new Date("2026-10-20T00:00:00Z") } }).priority).toBe("P1");
    expect(decidePriority({ ...shipping, order: { status: "shipped", promisedDeliveryAt: new Date("2026-10-25T00:00:00Z") } }).priority).toBe("P2");
    expect(decidePriority({ ...shipping, order: { status: "shipped", shippedAt: new Date("2026-10-10T00:00:00Z") } }).priority).toBe("P1");
  });
  it("puts a photo at least at P2", () => {
    expect(decidePriority({ ...base, category: "other", hasNonText: true }).priority).toBe("P2");
  });
  it("raises one level when the buyer writes repeatedly", () => {
    expect(decidePriority({ ...base, recentBuyerMessages: 3 }).priority).toBe("P2");
  });
});

describe("checkDraft", () => {
  it.each([
    "Don't worry, we will refund you today.",
    "Kami akan refund dalam 3 hari",
    "我们会退款给您",
    "Your parcel is guaranteed to arrive tomorrow",
  ])("flags over-promise: %s", (text) => expect(checkDraft(text)).toContain("possible_overpromise"));

  it("does not flag a neutral holding reply", () => {
    expect(checkDraft("Thanks! Could you send a photo of the item? We will check and get back to you.")).toEqual([]);
  });
});

describe("manual import", () => {
  it("pseudonymizes buyers and keeps the name out of the raw payload", () => {
    const [m] = normalizeMessages([{ buyer: "Siti Aminah", text: "hi", channel: "shopee" }]);
    expect(m.buyerRef).toBe(pseudonymize("shopee", "Siti Aminah"));
    expect(JSON.stringify(m.raw)).not.toContain("Siti");
  });
  it("parses a pasted conversation with stable ids", () => {
    const text = "B: where is my order?\nS: shipped yesterday\nB: ok\nthanks";
    const a = parsePastedConversation({ channel: "shopee", buyer: "x", text });
    const b = parsePastedConversation({ channel: "shopee", buyer: "x", text });
    expect(a.map((m) => m.sender)).toEqual(["buyer", "seller", "buyer"]);
    expect(a[2].text).toBe("ok\nthanks");
    expect(a.map((m) => m.id)).toEqual(b.map((m) => m.id));
  });
});

describe("editRatio", () => {
  it("is 0 for unchanged, 1 for fully rewritten", () => {
    expect(editRatio("we will check", "we will check")).toBe(0);
    expect(editRatio("we will check", "totally different reply")).toBe(1);
    expect(editRatio("您好 我们会查看", "您好 我们会查看")).toBe(0);
  });
});
