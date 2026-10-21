// Cheap script/stopword language detection. Used as a fallback and as a sanity check on the model.
import type { Language } from "./taxonomy.js";

const MALAY_WORDS = new Set(
  "saya awak anda boleh tak tidak ke ya barang sampai lagi bila dah belum sudah nak mahu tolong terima kasih kenapa macam mana pesanan baju saiz tukar pulangan wang duit rosak salah hantar ni tu dengan untuk dari kat pun je lah kan ke bang kak sis encik puan".split(" "),
);
const ENGLISH_WORDS = new Set(
  "the a is are my i you your order when where why how can not received refund return size wrong please thanks thank still item parcel what did does have has".split(" "),
);

export function detectLanguage(text: string): Language {
  const cjk = (text.match(/[㐀-鿿]/g) ?? []).length;
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  const malay = words.filter((w) => MALAY_WORDS.has(w)).length;
  const english = words.filter((w) => ENGLISH_WORDS.has(w)).length;
  const latin = malay + english;

  if (cjk > 0 && latin >= 2) return "mixed";
  if (cjk > 0) return "zh";
  if (malay > 0 && english > 0 && Math.min(malay, english) / Math.max(malay, english) >= 0.5) return "mixed";
  if (malay > english) return "ms";
  return "en";
}
