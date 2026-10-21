// Post-check on every draft. The model is told never to promise money or outcomes; this catches it when it does anyway.
// A flagged draft is still shown, with a warning, so Mom decides.
const OVERPROMISE = [
  /\b(we|i) (will|'ll|can|shall) (refund|give you a refund|send (you )?a (new|replacement)|compensate|reimburse)/i,
  /\b(full|100%) refund\b/i,
  /\brefund (is|has been) (approved|processed)\b/i,
  /\b(akan|boleh) (refund|pulangkan (duit|wang)|ganti baru|hantar (yang )?baru)\b/i,
  /(会|可以|帮你|给你).{0,4}(退款|退钱|赔偿|补发|换新)/,
  /(保证|一定).{0,6}(到|收到|退)/,
  /\b(guarantee|guaranteed|pasti sampai)\b/i,
];

export function checkDraft(text: string): string[] {
  const flags: string[] = [];
  if (OVERPROMISE.some((re) => re.test(text))) flags.push("possible_overpromise");
  if (/\b\d{1,3}(?:[.,]\d{2})?\s?(rm|myr)\b|\brm\s?\d/i.test(text)) flags.push("mentions_amount");
  return flags;
}
