# After-sales message triage assistant (message-aggregrator)

> Status: design phase · Last updated: 2026-10-21 · English version, updated for Mom's shop and the platform APIs
> Local path: C:\Users\halfm\Documents\james\04-Project\message-aggregrator\en

## One-liner

An assistant for Mom's online shop. It pulls customer messages from Shopee and TikTok Shop through their official APIs, classifies each message, looks up the order and the shop policy, sets a priority, and drafts a reply in the customer's language. Mom reviews the draft and sends it herself.

## Why this project

This is a portfolio project for the Applied AI Engineer role, with Forward Deployed Engineer work as the next step. It should prove three things:

1. I can build and deploy a system end to end (front end, back end, database, containers, deployment, CI/CD).
2. I can measure it: there are evaluation numbers, and I can say when it fails.
3. It works with a real user, and there is a before/after comparison.

## What changed from the first version

| Topic | First version | This version |
|---|---|---|
| User | A seller still to be found, or synthetic data | Mom's shop (real messages, real baseline) |
| Channels | Pasted or imported text | Shopee API and TikTok Shop API, with manual import kept as a fallback |
| Order system | Order CSV | SiteGiant is the shop's e-commerce system; order data source still to be decided |
| Plan | One track | Two tracks: manual import always works; API intake is added when the platforms approve access |
| Deployment | Week 3 | Week 2, because webhooks need an always-on public HTTPS address |
| Scope | No platform intake, no sending | Read-only API intake first; sending via API only later, one message at a time |

## Document index

| File | Content |
|---|---|
| 01-scenario.md | Scenario, users, scope, success metrics |
| 02-architecture.md | Architecture, components, message flow (Mermaid diagrams) |
| 03-data-model.md | Database design |
| 04-triage-rules.md | Categories, priority, reply rules |
| 05-evaluation.md | Test set, metrics, experiments, ingestion reliability |
| 06-cost-estimate.md | Cost estimate, assumptions, sources |
| 07-before-after.md | Before/after comparison from the user's point of view |
| 08-plan-8-weeks.md | 8-week plan, daily rhythm, fallback rules |
| 09-risks-privacy.md | Risks, privacy, platform terms, data handling |
| 10-interview-story.md | How to present the project in interviews |
| 11-decision-log.md | Decided, proposed and open items |
| 12-platform-integration.md | What I found about the Shopee, TikTok Shop and SiteGiant APIs, and what is still unverified |
| 13-requests-for-mom.md | What to ask Mom for |

## Status tags

| Tag | Meaning |
|---|---|
| [Decided] | A decision I stated myself |
| [Proposed] | A design proposal that is not confirmed yet |
| [Unverified] | Comes from a third-party source or was not checked; verify before relying on it |
| [Open] | Needs an answer from me, from Mom, from a platform, or from experiments |

## Decided constraints

- Start the project from scratch; the code of the earlier backend project is gone.
- Do not use the company's scenario, code or data.
- Spend about 1 to 2 hours per day.
- Scenario: after-sales triage for an online shop.
- Use Mom's e-commerce shop as the real-world case. Her sales are mostly on TikTok Shop and Shopee, and her e-commerce system is SiteGiant.
- Pull Shopee and TikTok messages directly through the platform APIs.
