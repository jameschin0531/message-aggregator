-- 001 initial schema. Follows docs/03-data-model.md, plus a jobs table (the Postgres queue)
-- and a few columns the triage pipeline needs (marked "added").

CREATE TABLE shops (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel          text NOT NULL CHECK (channel IN ('shopee', 'tiktok', 'manual')),
  external_shop_id text NOT NULL,
  name             text,                                   -- added: display name in the inbox
  region           text NOT NULL DEFAULT 'MY',
  status           text NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_shop_id)
);

CREATE TABLE channel_tokens (
  shop_id           uuid PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  access_token_enc  text NOT NULL,                         -- AES-256-GCM, see src/lib/crypto.ts
  refresh_token_enc text NOT NULL,
  expires_at        timestamptz NOT NULL,
  refresh_expires_at timestamptz,                          -- added: authorization expiry for health checks
  scopes            text[] NOT NULL DEFAULT '{}',
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sync_state (
  shop_id         uuid PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  last_poll_at    timestamptz,
  last_webhook_at timestamptz
);

CREATE TABLE conversations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                 uuid NOT NULL REFERENCES shops(id),
  channel_conversation_id text NOT NULL,
  buyer_ref               text NOT NULL,                   -- pseudonym, never the buyer's name
  last_message_at         timestamptz,
  UNIQUE (shop_id, channel_conversation_id)
);

CREATE TABLE messages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id            uuid NOT NULL REFERENCES shops(id),
  channel            text NOT NULL,
  conversation_id    uuid NOT NULL REFERENCES conversations(id),
  channel_message_id text NOT NULL,
  sender_type        text NOT NULL CHECK (sender_type IN ('buyer', 'seller', 'system')),
  message_type       text NOT NULL DEFAULT 'text',         -- text, image, video, sticker, order_card, ...
  text               text,
  raw_payload        jsonb,
  language           text,
  created_at_channel timestamptz NOT NULL,
  received_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, channel_message_id)
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at_channel);

CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id            uuid NOT NULL REFERENCES shops(id),
  channel            text NOT NULL,
  channel_order_id   text NOT NULL,
  sitegiant_order_no text,
  items              jsonb NOT NULL DEFAULT '[]',
  status             text NOT NULL,                        -- normalized: unpaid, to_ship, shipped, delivered, cancelled, returned
  tracking_no        text,
  created_at         timestamptz NOT NULL,
  shipped_at         timestamptz,                          -- added: drives "late delivery" priority
  delivered_at       timestamptz,                          -- added: drives return-window checks
  promised_delivery_at timestamptz,                        -- added: "past the promised date" escalation (docs/04)
  UNIQUE (shop_id, channel_order_id)
);
CREATE INDEX orders_sitegiant_idx ON orders (sitegiant_order_no);

CREATE TABLE policies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope          text NOT NULL,                            -- 'shop', or a channel name ('shopee', 'tiktok')
  topic          text NOT NULL,                            -- returns, refunds, exchange, shipping, cancellation, ...
  text           text NOT NULL,
  version        int  NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, topic, version)
);

CREATE TABLE tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  category        text,
  priority        text,                                    -- P1 (urgent), P2, P3
  priority_reasons text[] NOT NULL DEFAULT '{}',           -- added: why this priority (shown in the inbox)
  language        text,                                    -- added
  order_id        uuid REFERENCES orders(id),
  extracted_order_ref text,                                -- added: what the buyer typed, even if unmatched
  needs_human     boolean NOT NULL DEFAULT false,          -- added: non-text messages, low confidence, ...
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'replied', 'closed', 'error')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- One open ticket per conversation; new buyer messages reopen/extend it.
CREATE UNIQUE INDEX tickets_one_open_per_conversation
  ON tickets (conversation_id) WHERE status IN ('new', 'triaged');

CREATE TABLE drafts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      uuid NOT NULL REFERENCES tickets(id),
  text           text NOT NULL,
  policy_refs    jsonb NOT NULL DEFAULT '[]',              -- added: [{id, topic, version}] the draft relied on
  safety_flags   text[] NOT NULL DEFAULT '{}',             -- added: e.g. possible_overpromise
  model          text NOT NULL,
  prompt_version text NOT NULL,                            -- added
  input_tokens   int,
  output_tokens  int,
  cost           numeric(10, 6),
  latency_ms     int,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id    uuid NOT NULL REFERENCES drafts(id),
  final_text  text NOT NULL,
  accepted    boolean NOT NULL,
  edit_ratio  real NOT NULL,                               -- 0 = sent unchanged, 1 = fully rewritten
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ingestion_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shop_id     uuid REFERENCES shops(id),
  kind        text NOT NULL CHECK (kind IN ('webhook', 'poll', 'import', 'duplicate', 'error')),
  message_ref text,
  at          timestamptz NOT NULL DEFAULT now(),
  detail      jsonb
);

CREATE TABLE jobs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind        text NOT NULL,                               -- 'triage'
  payload     jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  attempts    int  NOT NULL DEFAULT 0,
  run_after   timestamptz NOT NULL DEFAULT now(),
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_ready_idx ON jobs (run_after) WHERE status = 'queued';

CREATE TABLE eval_cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id    text UNIQUE,                              -- added: stable id from the case file
  channel        text NOT NULL,
  message_text   text NOT NULL,
  gold_category  text NOT NULL,
  gold_priority  text NOT NULL,
  gold_order_id  text,
  language       text NOT NULL,
  source         text NOT NULL CHECK (source IN ('real', 'synthetic'))
);

CREATE TABLE eval_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at         timestamptz NOT NULL DEFAULT now(),
  model          text NOT NULL,
  prompt_version text NOT NULL,
  effort         text,
  notes          text,
  summary        jsonb                                     -- added: headline metrics
);

CREATE TABLE eval_results (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id             uuid NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  case_id            uuid NOT NULL REFERENCES eval_cases(id),
  predicted_category text,
  predicted_priority text,
  predicted_order_id text,
  predicted_language text,
  correct            jsonb NOT NULL,                       -- {category, priority, order_id, language}
  cost               numeric(10, 6),
  latency_ms         int
);

CREATE TABLE audit_log (
  id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor  text NOT NULL,
  action text NOT NULL,
  target text,
  at     timestamptz NOT NULL DEFAULT now(),
  detail jsonb
);
