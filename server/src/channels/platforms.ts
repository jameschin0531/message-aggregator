// Placeholders for Phase B. Each will implement webhook parsing (after signature check),
// catch-up pulls and order pulls once the platform approves the app and Mom authorizes it.
// Endpoint names, payload shapes and signing rules are [Unverified] until checked against
// the official docs for an approved app; see docs/12-platform-integration.md.
import type { ChannelAdapter } from "./types.js";

class NotApprovedYet extends Error {
  constructor(channel: string) {
    super(`${channel} API access is not approved yet; use manual import`);
  }
}

export const shopeeAdapter: ChannelAdapter = {
  channel: "shopee",
  async pullMessages() {
    throw new NotApprovedYet("Shopee");
  },
};

export const tiktokAdapter: ChannelAdapter = {
  channel: "tiktok",
  async pullMessages() {
    throw new NotApprovedYet("TikTok Shop");
  },
};
