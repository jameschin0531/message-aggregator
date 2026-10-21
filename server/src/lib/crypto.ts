// AES-256-GCM for platform OAuth tokens at rest (channel_tokens). Key from TOKEN_ENC_KEY (32 bytes, base64).
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config.js";

function key(): Buffer {
  const k = Buffer.from(config.tokenEncKey, "base64");
  if (k.length !== 32) throw new Error("TOKEN_ENC_KEY must be 32 bytes, base64-encoded");
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string): string {
  const [iv, tag, data] = blob.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
