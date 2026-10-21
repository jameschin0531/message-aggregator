# 04 Triage rules

> [Proposed] A starting taxonomy. Check it against Mom's real messages before relying on it.

## Categories

| Category | Examples | Default priority |
|---|---|---|
| Refund or return | Wants money back, wants to return | Medium; higher if angry or threatening |
| Parcel not received or shipping | The promised date has passed | Medium; higher once past the promised date |
| Item problem | Damaged, wrong item, missing item | High |
| Charged but no order | Paid but no order found | High |
| Threat of bad review or platform complaint | Aggressive tone, mentions a complaint | High |
| Cancel order | Wants to cancel before shipping | Medium |
| Size or spec question | Pre-purchase question | Low |
| Other | Cannot be classified | Low; leave to Mom |

## Language

- Detect English, Chinese, Malay and mixed messages.
- Reply in the buyer's main language; when mixed, follow the language of the latest message. [Open] confirm Mom's habit.

## Channel-specific rules

| Rule | Reason |
|---|---|
| Policies can differ per platform (Shopee vs TikTok) | Platform rules for returns and refunds differ; the policy table has a scope field |
| Non-text messages (images, stickers, product or order cards) are marked "needs human" at first | Some types are not returned as readable text by the API [Unverified] |
| Platform-generated system messages are stored but not triaged | They are not buyer questions |

## Draft rules

| Rule | Detail |
|---|---|
| Only cite policies that exist | Every promise in a draft must match a policy row |
| Highlight promises | Refunds, compensation and re-shipping are highlighted for Mom |
| Missing order ID | Ask the buyer for it; never guess |
| Several candidate orders | List them and let Mom choose |
| Low confidence or missing information | Mark "needs a person"; do not write a confident draft |
| Tone | Polite and short; calibrate with Mom's saved replies [Open] |

## Escalation rules

| Condition | Action |
|---|---|
| Mentions complaint, bad review, lawyer or police | Priority high, pinned to the top |
| Charged but no order | Priority high |
| Same buyer writes repeatedly in a short time | Raise priority |
| The model has low confidence | Mark "needs a person" |

## To validate

- Whether the categories cover Mom's real messages, and which to merge or split.
- Whether the priority rules match how she actually decides, using labeled data.
