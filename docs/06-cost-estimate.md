# 06 Cost estimate

> Estimated 2026-10-21. Prices come from third-party articles quoting official price lists; I have not opened the official pages [Unverified]. Check before paying:
> Official pricing page: https://platform.claude.com/docs/en/about-claude/pricing
> Exchange rate assumption: 1 USD is about RM4.5; check the current rate.

## Summary

The 8-week project costs roughly US$30 to 160 (about RM135 to 720). Most of it is model calls during development and evaluation. With Mom's shop live, expect about US$22 to 70 per month, mostly hosting.

## 1. Model prices (per million tokens)

| Model | Input | Output | Notes |
|---|---|---|---|
| Haiku 5.5 | $0.10 | $0.50 | For prompts up to 100K tokens; higher above that |
| Sonnet 5.5 | $2.00 | $10.00 | The batch interface halves the price |

Also: new models use about 30% more tokens for the same text, and effort level can move the bill more than the per-token price. Claude subscription plans do not include API usage; the API is billed separately.

## 2. Token assumptions per ticket (my assumptions; calibrate with real data)

| Assumption | Input | Output |
|---|---|---|
| One call that classifies and drafts | About 3,000 | About 500 |
| Two calls, including reasoning overhead | About 6,000 | About 1,500 |

## 3. Monthly model cost

| Tickets per month | Haiku | Sonnet |
|---|---|---|
| 300 | $0.17 to 0.41 | $3.3 to 8.1 |
| 1,000 | $0.55 to 1.35 | $11 to 27 |
| 3,000 | $1.65 to 4.05 | $33 to 81 |

Use Mom's real volume (see 13) to pick the row.

## 4. Development and evaluation

Assume 100 labeled cases run about 20 times, roughly 2,000 runs.

| Setup | Estimate |
|---|---|
| Triage worker on Haiku, Sonnet as judge | About $25 |
| Worker and judge both on Sonnet | About $76 |
| Plus prompt experiments | About $30 to 100 for the whole development period |

Evaluation through the batch interface can cut this in half.

## 5. Hosting and database

Real platform intake needs an always-on public HTTPS endpoint, so free tiers that sleep when idle are not suitable for production use. They are still fine for local development and demos.

| Option | Monthly cost | Notes |
|---|---|---|
| Render free web service + Supabase free | $0 | Render's free service sleeps after 15 minutes idle and takes about a minute to wake; Supabase free is 500 MB and pauses after a week idle; development and demos only |
| Render paid | About $21 | API, triage worker and database at about $7 each; workspace fees not confirmed |
| Supabase Pro + one API service | About $32 | Supabase Pro is $25 with 8 GB of database |
| Railway | About $6 to 9 | Entry price for a small always-on app; usage-based |
| AWS | Free plan for up to 6 months with up to $200 credits, then pay as you go | Fixed costs (load balancer, managed database) not checked; usually higher than the options above |

Suggestion: run the main system on Render or Railway and deploy the same container once on AWS inside the free credits to practice cloud skills. [Proposed]

## 6. Other items

| Item | Estimate |
|---|---|
| Domain | A few tens of ringgit per year; not checked |
| CI/CD | GitHub Actions is free for public repositories and has a free allowance for private ones; not checked |
| Monitoring and alerts | Free tiers first; not checked one by one |
| Platform API fees | I found no fee for TikTok Shop partner registration in a third-party guide; Shopee fees not checked [Unverified] |

## 7. Total for 8 weeks

| Item | Estimate |
|---|---|
| Model calls (development and evaluation) | $30 to 100 |
| Hosting and database (about 1.5 months from week 2) | $0 to 60 |
| Total | About $30 to 160, about RM135 to 720 |

## 8. Cost controls

| Action | Purpose |
|---|---|
| Use the batch interface for evaluation | Half price |
| Low effort for classification, higher only for urgent items | Effort level affects the bill |
| Set a monthly spending limit in the API console | Stops a runaway loop |
| Put policy text in a cacheable fixed prompt | Repeated text is billed at the cache price; check the discount in the docs |
| Choose the model by evaluation | Try Haiku first, move to Sonnet only if accuracy is not enough |

## Sources (third-party, unverified)

- Haiku 5.5 pricing: https://apidog.com/blog/claude-haiku-5-5-pricing/
- Sonnet 5.5 pricing: https://anotherwrapper.com/llm-pricing/claude-sonnet-5-5
- AWS free plan: https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/
- Supabase: https://makerkit.dev/blog/saas/supabase-pricing
- Render: https://costbench.com/software/developer-tools/render/
- Render vs Railway vs Fly.io: https://findstack.com/resources/railway-vs-render-vs-fly-io
