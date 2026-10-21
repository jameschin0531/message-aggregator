# 11 Decision log

> Last updated: 2026-10-21

## Decisions

| Item | Status | Notes |
|---|---|---|
| Scenario: after-sales triage for an online shop | [Decided] | |
| Do not use the company scenario | [Decided] | Reasons: showing de-identified data later is a hassle; the company would not support it and it could backfire |
| Start the project from scratch | [Decided] | The earlier backend project's code is gone |
| 1 to 2 hours per day | [Decided] | |
| Use Mom's e-commerce shop as the real case | [Decided] | Her sales are mostly on TikTok Shop and Shopee; her e-commerce system is SiteGiant |
| Pull Shopee and TikTok messages directly through the platform APIs | [Decided] as a goal | Access is subject to platform approval and is not verified for Malaysia |
| Manual import kept as a fallback track | [Proposed] | So the project never depends on approval |
| Read-only intake first; Mom replies herself | [Proposed] | Sending may need more permissions and rule checks |
| Phase C (send through the API, one at a time) | [Open] | Only after approvals, terms review and a stable Phase B |
| Webhook plus catch-up pull, with deduplication | [Proposed] | |
| Job table in Postgres instead of a queue | [Proposed] | |
| Order data source | [Open] | Platform order APIs, SiteGiant export, or SiteGiant API if one exists |
| Model choice | [Open] | Decide by evaluation: Haiku first, Sonnet if not enough |
| Hosting: Render or Railway, plus one AWS deployment for learning | [Proposed] | Free tiers that sleep are not suitable for webhooks |
| Cloud provider | [Open] | Read 10 job descriptions first |
| Test set of 100 labeled messages | [Proposed] | Review at week 4 |

## Open questions

| Question | Why it matters |
|---|---|
| Does each platform open the chat API to a Malaysian shop of Mom's type? | Decides whether the API track is possible |
| What do the platform terms say about AI processing of buyer messages and about replies? | Decides what is allowed |
| Does SiteGiant have an API, or what can it export? | Order data source |
| Messages per day per platform, and the language mix | Cost and evaluation design |
| Who replies, and when? | Priority rules and the baseline |
| Mom's reply style and saved replies | Draft calibration |
| How may anonymized results appear in a portfolio? | Showcase plan |

## Change log

| Date | Change |
|---|---|
| 2026-10-21 | First version: scenario, architecture, cost, comparison, plan |
| 2026-10-21 | English version: Mom's shop, Shopee and TikTok Shop API intake, SiteGiant, two-track plan, new docs 12 and 13 |
