# 08 Eight-week plan

> [Proposed] About 1 to 2 hours a day. If I am more than 3 days behind, cut scope instead of extending.

## Daily rhythm

| Rhythm | Plan |
|---|---|
| Weekdays | About 1 hour a day, at least one commit |
| Weekend | One block of 2 to 3 hours; the other day fully off |
| Every Sunday | Write 5 lines: what I delivered, where I got stuck, what is next |
| Every Friday | Show someone and let them ask "why did you design it this way" |

## Rules

1. Code lives in a remote repository from day one, with daily commits.
2. Write the skeleton by hand; use AI for review and for tests, and read the tests to learn.
3. Weeks 4 and 8 are checkpoints.
4. Two tracks: the manual-import track must always work; the API track is added as platforms approve access. Approval never blocks the project.
5. If behind by more than 3 days, cut the week 5 comparison experiments first and keep deployment and evaluation.
6. Kubernetes stays out of scope; understand the concept only.
7. App keys and tokens never go into the repository.

## Week 0 (no code, start now)

| Task | Notes |
|---|---|
| Agree the scope with Mom | A clear written yes: what I can see, how it is used, whether anonymized results can be shown, who owns the code |
| Apply for API access | Shopee Open Platform and TikTok Shop Partner Center; approvals take the longest, so do this first (see 12) |
| Ask SiteGiant | Whether it has an API, and what it can export |
| Sit with Mom for an hour | Watch how she handles messages |
| Measure the baseline | One week with a timer: time per message, errors, missed messages |
| Collect 100 to 200 historical messages | With consent, kept local; screenshots or copy-paste until the API is approved |
| Get policies and a sample order export | Returns, shipping, delivery times; SiteGiant or platform export |
| Ask about volume | Messages per day per platform |

## Weeks 1 to 8

| Week | Deliverable |
|---|---|
| 1 | Repository and skeleton: React inbox, Node API (controller, service, repository), Postgres schema, docker-compose, the channel adapter interface, manual import working; a one-page design note |
| 2 | Triage worker on the LLM (language, category, order ID, draft); deployed to an always-on service with a public HTTPS address; webhook receiver tested against the platforms' sandbox or test tools |
| 3 | First platform connected (whichever approves first): authorization, token refresh, webhook plus catch-up pull, deduplication; CI/CD with GitHub Actions |
| 4 | Evaluation v1: 100 labeled messages and baseline numbers. Checkpoint 1 |
| 5 | Second platform connected; comparison experiments (method, model, effort) |
| 6 | Reliability: ingestion health checks, missed and duplicate message rates, logs, per-ticket cost, 3 failure cases, prompt-injection tests |
| 7 | Mom uses it for real; fix problems; record the "after" timings |
| 8 | Write-up: design document, rejected alternatives, results; rehearse a 10-minute talk; mock interview. Checkpoint 2 |

If neither platform approves access by week 3, continue with the manual track. The evaluation, deployment and real-use story still hold; the integration then becomes "next step" instead of "done".

## Week 1, day by day

| Day | Task |
|---|---|
| 1 | Create the GitHub repository; start Postgres with docker-compose |
| 2 | API skeleton with controller, service, repository layers |
| 3 | Design the schema and migrations (including channels, tokens, sync state) |
| 4 | React inbox shell |
| 5 | Connect front end and back end; store one message through the manual adapter |
| Weekend | One-page design note: data model, interfaces, why this layering |

## Learning order for deployment

Docker, then a container registry, then a simple always-on managed service, then CI/CD, then Kubernetes concepts. If using AWS, check which free plan the new account gets: accounts created from 15 July 2025 get a free plan of up to 6 months with up to $200 of credits.

## When to start applying for jobs

From week 4: there is a deployed service and a baseline evaluation to show.
