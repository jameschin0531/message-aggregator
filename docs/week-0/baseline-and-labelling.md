# Week 0 kit: baseline timing and labelling

## 1. Baseline timing sheet (one week, docs/01 metrics)

One row per buyer message Mom handles. A shared spreadsheet on her phone is easiest. Columns:

| Column | Example | Notes |
|---|---|---|
| date | 2026-10-27 | |
| platform | shopee / tiktok | |
| buyer_msg_time | 14:02 | Time the buyer sent it (from the chat) |
| reply_time | 14:31 | Time Mom replied |
| handling_seconds | 95 | From opening the chat to sending the reply (timer) |
| needed_order_lookup | yes / no | |
| category | shipping | Use the docs/04 categories |
| urgent | yes / no | Mom's own judgement |
| language | zh / en / ms / mixed | |
| late_or_missed | no | Answered more than half a day late, or missed |

This gives the "before" numbers: handling time per message, first response time for urgent messages,
missed/late count per week, and the language and category mix that sets the cost estimate (docs/06).

## 2. Turning real conversations into eval cases

Real cases go in `server/data/real/eval-cases.json`. That folder is gitignored, so real data never reaches the repository.
Same format as `server/data/synthetic/eval-cases.json`:

```json
{
  "now": "2026-10-21T04:00:00Z",
  "cases": [
    {
      "id": "r001",
      "channel": "shopee",
      "source": "real",
      "messages": [
        { "text": "brg x sampai lg, order 241019KX7P2M4Q", "minutes_ago": 30 },
        { "sender": "seller", "text": "...", "minutes_ago": 20 },
        { "type": "image", "text": null, "minutes_ago": 5 }
      ],
      "gold": { "category": "shipping", "priority": "P2", "order_id": "241019KX7P2M4Q", "language": "ms" },
      "tags": ["slang"]
    }
  ]
}
```

Rules for labelling:

- Remove names, phone numbers and addresses before saving (keep order numbers; they are needed).
- `now` is the moment the case is judged; set `minutes_ago` so the timing rules make sense.
- Label what Mom *would* do, not what the rules currently do. Disagreements are the interesting failures.
- `order_id` is the order that should be matched, or `null` if none or several.
- Put the matching orders (anonymized) in `server/data/real/orders.json` and run with `--orders data/real/orders.json`.
- After a few days, relabel 20 cases without looking and compare (docs/05 label consistency).
- Aim for every category × language combination; tag hard ones (`slang`, `aggressive`, `several-orders`, `non-text`).
