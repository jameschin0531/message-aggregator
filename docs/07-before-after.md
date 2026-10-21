# 07 Before and after, from the user's point of view

> The numbers below are targets, not results. Measure "before" with a timer in week 0, then measure "after" the same way.

## A typical day in Mom's shop

Assume about 30 buyer messages a day across Shopee and TikTok Shop, in Chinese, English and Malay. [Open] replace with Mom's real numbers.

| Moment | Without the system | With the system |
|---|---|---|
| Opening up in the morning | Check the Shopee app, then the TikTok app; judge by feel what is urgent | One inbox with both platforms; urgent items first; each has a category and language tag |
| "My parcel has not arrived for two weeks, I want a refund" | Find the order in the platform or SiteGiant, check tracking, recall the refund rule, write a reply while the buyer waits | The ticket already shows the matched order, shipping status and days in transit, the relevant policy, and a draft in the buyer's language |
| A message mixing English and Chinese | Reply from own language skills, sometimes slowly | A draft in the buyer's language; edit a few words and send |
| The 20th time the same question appears | Copy an old reply and edit it; easy to miss the order number | The draft fills in the order details and the policy |
| End of day | Unsure whether something was missed; checking again before bed | A list of unanswered tickets; clear it and stop |
| Weekly review | An impression that returns went up | Counts per category and per platform |

## Metrics (to be measured)

| Metric | Before: how to measure | After: target | Check |
|---|---|---|---|
| Handling time per message | Timer for a week | Set after the baseline | Measure the same way again |
| First response to urgent messages | Time from buyer message to reply | Shorter | Compare weekly medians |
| Missed or half-day-late messages | Weekly count | Close to 0 | Compare |
| Replies that contradict the policy | Sample 20 replies | Fewer | Check against the policy table |
| Time spent replying after work | Mom's own log | Shorter | Self-report |
| Time spent finding orders | Log | Mostly automatic | Check match accuracy |
| Messages missed by the integration | Compare with the platform app | Close to 0 | Ingestion metrics in 05 |
| Visibility of trends | None | Weekly counts per category | Whether she uses them |

## Extra work the system adds

| Item | Effect |
|---|---|
| Authorizing the apps | One-time setup on both platforms; re-authorization when it expires |
| Importing orders (until an order API is connected) | A few minutes a day if SiteGiant exports are used |
| Reviewing drafts | Every draft is read; none is sent unchecked |
| First weeks | Fixing wrong categories and editing the policy table; trust takes time |
| A new screen to learn | Slower at first |

Net time saved is lower once this is subtracted. If draft acceptance is low, or the order import is a chore, the saving may be small.

## What does not change

- Mom replies on the platform herself in the first phases.
- Refunds and compensation stay her decision.
- The system never talks to a buyer on its own.

## Worse cases

| Case | Consequence | Mitigation |
|---|---|---|
| Wrong order matched | The buyer gets wrong shipping or amount information | Show the match evidence so it can be checked at a glance |
| Draft promises something outside the policy | Mom has to honor it | Highlight promises; count over-promises in evaluation |
| Mom starts sending without reading | Errors reach buyers | Require a confirm click; track the edit rate and warn when it stays at 0 |
| A message is missed by the integration | An urgent buyer is ignored | Catch-up pull, ingestion health alerts, side-by-side check with the platform app |
| Buyer data leaks or is misused | Personal data problem | Consent, minimization, local or controlled storage |

## How to show an improvement

1. Weeks 0 to 1: no system; record the baseline with a timer and a sheet.
2. Weeks 2 to 3 onward: use the system and record the same things.
3. Compare, and report the sample size (how many messages, how many days).

Two weeks of data should be written as "observed in this shop during this period", not as a general result.
