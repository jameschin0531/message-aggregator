# 10 How to present this project in interviews

## A 10-minute structure

| Part | Content |
|---|---|
| 1. Problem | Mom's shop: about 30 buyer messages a day across Shopee and TikTok Shop, two separate apps, mixed languages; what hurt |
| 2. Baseline | Time per message and error count before the system (from the week 0 timer) |
| 3. Design | One architecture diagram and why it is split this way |
| 4. Integration | How messages arrive: official APIs, webhook plus catch-up pull, deduplication, token refresh, and the fallback track |
| 5. Trade-offs | Rejected options and reasons: no auto-send, read-only first, job table instead of a queue, policies read from the database |
| 6. Evaluation | Test set, metrics, baseline, change after improvements, ingestion reliability |
| 7. Failures | At least 3 failure cases: how found, how fixed |
| 8. Cost and latency | Per-ticket cost and latency; why this model |
| 9. Real use | How Mom used it, what was awkward, what changed |
| 10. Next step | Sending through the API, more languages, a bigger test set |

## Questions to prepare for

| Question | Key points |
|---|---|
| Build a chatbot end to end: how would you do it? | Front end, back end and database; how the infrastructure is connected; CI/CD and deployment; evaluation |
| How do you know it is good? | Test set, metrics, baseline, failure cases |
| What if the model is wrong? | Human approval, policy table, missed-urgent rate, over-promise checks |
| What happens if the platform webhook fails? | Catch-up pull, deduplication, health checks, comparison with the platform app |
| How did you handle authorization? | OAuth through the platform flow, encrypted tokens, refresh, expiry alerts |
| Why that model? | Accuracy vs cost vs latency from your experiments |
| Why not auto-send? | Cost of a wrong reply, shop owner's responsibility, platform rules |
| How do you keep AI-written code reliable? | Hand-written skeleton, AI review, reading the tests, evaluation as a safety net |
| How did you handle data safety? | Consent, local storage, minimization, synthetic data for the public repo |
| What if volume grows 10 times? | Where the bottleneck is and what to change (queue, cache, model tiers) |
| What did you learn from a specific failure? | One concrete failure and its fix |

## What the project signals

| Role | What it shows |
|---|---|
| Applied AI Engineer | Shipped, measured, cost-aware, handles reliability |
| Forward Deployed Engineer | A real user, a vague need turned into a system, platform integration and approval work, a before/after number, communication with a non-technical user |

## What to avoid

- Presenting untested targets as results.
- Calling it a general solution when it is one shop and a few weeks of data.
- Not being able to name rejected options and failure cases.
- Showing real buyer data.
