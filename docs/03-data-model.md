# 03 Data model

> [Proposed] A starting point; adjust in week 1.

| Table | Main fields | Notes |
|---|---|---|
| shops | id, channel, external_shop_id, region, status | One row per connected shop and channel |
| channel_tokens | shop_id, access_token_enc, refresh_token_enc, expires_at, scopes | Encrypted; refreshed automatically; track authorization expiry |
| sync_state | shop_id, last_message_at, last_poll_at, last_webhook_at | Powers ingestion health checks |
| conversations | id, shop_id, channel_conversation_id, buyer_ref, last_message_at | Buyer reference is a pseudonym, not a name |
| messages | id, shop_id, channel, conversation_id, channel_message_id, sender_type, message_type, text, raw_payload, language, created_at_channel, received_at | Unique on (shop_id, channel_message_id) |
| tickets | id, conversation_id, category, priority, order_id, status | One per conversation or per issue |
| orders | id, shop_id, channel, channel_order_id, sitegiant_order_no, items, status, tracking_no, created_at | Source: platform order API or SiteGiant export |
| policies | id, scope (shop or channel), topic, text, version, effective_from | Versioned |
| drafts | id, ticket_id, text, model, input_tokens, output_tokens, cost, latency_ms | One per generation |
| reviews | id, draft_id, final_text, accepted, edit_ratio, reason | Mom's final text and edits |
| ingestion_events | id, shop_id, kind (webhook, poll, duplicate, error), message_ref, at, detail | Measures missed and duplicate messages |
| eval_cases | id, channel, message_text, gold_category, gold_priority, gold_order_id, language, source | Source marks real or synthetic |
| eval_runs | id, run_at, model, prompt_version, effort, notes | One evaluation run |
| eval_results | id, run_id, case_id, predicted fields, correct, cost, latency_ms | Per case |
| audit_log | id, actor, action, target, at | Who did what |

## Notes

- The reviews table matters most: every edit Mom makes is a free evaluation record.
- Policies are versioned so a draft can say which version it relied on.
- Drafts store cost and latency, which gives a per-ticket cost.
- eval_cases separates real from synthetic. Real data stays local; anything public uses synthetic data.
- Order IDs differ between Shopee, TikTok Shop and SiteGiant, so orders keep all of them and a mapping.
- Do not log buyer names, phone numbers or addresses.
