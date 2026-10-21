// Deterministic, rule-based stand-in for the model. Used by tests, CI and when no API key is set.
// It is also the "rules only" arm of the extraction-method experiment in docs/05: the model has to beat it.
import { detectLanguage } from "../triage/language.js";
import { extractOrderRefs } from "../triage/orderRef.js";
import type { Category } from "../triage/taxonomy.js";
import type { Classification, ConversationTurn, DraftInput, DraftOutput, TriageLLM, Usage } from "./types.js";

const RULES: [Category, RegExp][] = [
  ["item_problem", /damaged|broken|torn|stain|wrong (item|colou?r|size)|missing|rosak|koyak|salah (barang|hantar|warna|saiz)|tak cukup|kurang|破|坏|错|少了|漏发|脏/i],
  ["charged_no_order", /(charged|paid|deducted|bayar|potong|扣了|付了).{0,40}(no order|cannot find|tak (ada|jumpa)|没有订单|找不到)/i],
  ["cancel_order", /cancel|batal|取消/i],
  ["return_refund", /refund|return|exchange|money back|pulang|tukar|duit balik|退款|退货|退钱|换/i],
  ["shipping", /where|track|arrive|receive|deliver|ship|sampai|belum (dapat|terima)|bila|hantar|parcel|到了吗|还没|没收到|几时|物流|发货/i],
  ["complaint_threat", /report|complain|scam|1 star|bad review|lapor|tipu|投诉|差评|骗/i],
  ["product_question", /size|stock|material|colou?r|saiz|ada (lagi|stok)|kain|尺码|有货|材质|颜色|多大/i],
];

const UPSET = /!!|\?\?|scam|report|lapor|tipu|angry|marah|投诉|差评|骗|ridiculous|teruk/i;

function zeroUsage(): Usage {
  return { model: "fake", inputTokens: 0, outputTokens: 0, cost: 0, latencyMs: 0 };
}

export class FakeTriageLLM implements TriageLLM {
  readonly model = "fake";

  async classify(conversation: ConversationTurn[]): Promise<{ result: Classification; usage: Usage }> {
    const buyerTurns = conversation.filter((t) => t.sender === "buyer");
    const lastBuyer = buyerTurns.at(-1);
    const text = buyerTurns.map((t) => t.text ?? "").join("\n");
    const latest = lastBuyer?.text ?? "";
    const category = RULES.find(([, re]) => re.test(latest))?.[0] ?? RULES.find(([, re]) => re.test(text))?.[0] ?? "other";
    return {
      result: {
        language: detectLanguage(text),
        category,
        order_ref: extractOrderRefs(text)[0]?.ref ?? null,
        buyer_upset: UPSET.test(text),
        needs_human: lastBuyer?.type !== "text" || category === "other",
        confident: category !== "other",
        summary: `Buyer message classified as ${category} by keyword rules`,
      },
      usage: zeroUsage(),
    };
  }

  async draft(input: DraftInput): Promise<{ result: DraftOutput; usage: Usage }> {
    const lang = input.classification.language;
    const reply =
      lang === "zh"
        ? "您好，谢谢您的留言！我们会帮您查看一下，稍后回复您。"
        : lang === "ms"
          ? "Hai, terima kasih atas mesej anda! Kami akan semak dan maklumkan kepada anda nanti."
          : "Hi, thanks for your message! We will check and get back to you shortly.";
    return {
      result: {
        reply,
        policy_topics_used: input.policies.map((p) => p.topic),
        needs_mom_decision: ["return_refund", "item_problem", "charged_no_order"].includes(input.classification.category),
      },
      usage: zeroUsage(),
    };
  }
}
