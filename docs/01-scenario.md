# 01 Scenario

## Users

| Who | Role |
|---|---|
| Mom | Shop owner; reads customer messages, decides refunds, sends replies |
| Staff or family helping with replies | [Open] to confirm whether anyone else replies |
| Buyers | Send messages in Chinese, English and Malay, often mixed |

## Channels and systems

| Item | Detail |
|---|---|
| Sales channels | Mostly TikTok Shop and Shopee [Decided] |
| E-commerce system | SiteGiant, an ERP for Malaysian marketplace sellers that syncs orders and inventory [Decided] |
| Message source | The chat inside each platform's seller tools, read through the official APIs [Decided as a goal; access is not yet approved] |

## Problem

| Today | Pain |
|---|---|
| Messages arrive in two separate seller apps | Easy to miss one; hard to see what is urgent |
| Each message needs a manual order lookup | Slow; the buyer waits |
| Policy answers come from memory | Inconsistent replies |
| Mixed languages | Slow or awkward replies |
| No statistics | No view of which problems are most common |

## Inputs and outputs

| Input | Output |
|---|---|
| Buyer messages from Shopee and TikTok Shop (API), or pasted/imported text (fallback) | Language, category, priority, order ID |
| Order data (platform order API, or a SiteGiant export; source to be decided) | The matched order and its shipping status |
| Shop policies (returns, shipping, delivery times) | A draft reply in the buyer's language, with the policy it relies on |

## Scope in phases

| Phase | What it does | Depends on |
|---|---|---|
| A. Manual | Paste or import messages and orders; classify; draft; Mom reviews | Nothing external |
| B. API read-only | Receive and pull messages from Shopee and TikTok through the APIs; same triage; Mom replies in the platform herself | API approval from each platform |
| C. API send | Send an approved draft through the API, one message at a time | Send permission, platform terms, a stable Phase B |

Phase C is optional and comes last. Bulk or unattended sending is out of scope.

## Always done by a person

- Mom decides refunds and compensation.
- Mom reviews every draft before anything is sent.
- The system never talks to a buyer on its own.

## Success metrics (targets, to be measured)

| Metric | How the baseline is measured | Target |
|---|---|---|
| Handling time per message | Timer for one week | [Open] set after the baseline |
| First response time for urgent messages | Time from buyer message to reply | [Open] |
| Messages missed or answered more than half a day late | Weekly count | Close to 0 |
| Draft acceptance rate | Share of drafts sent unchanged or lightly edited | [Open] |
| Policy over-promises | Check against the policy table | 0 |
| Messages missed by the integration | Compare with the platform app | Close to 0 |

## Open items

| Item | Status |
|---|---|
| Messages per day on each platform | [Open] ask Mom |
| Who replies and when | [Open] |
| Whether SiteGiant has an API or what it can export | [Open] |
| Whether each platform opens the chat API for a Malaysian shop of Mom's type | [Open] [Unverified] |
