# 05 Evaluation

> Evaluation is the most convincing part of this project. Every prompt or model change should come with numbers.

## Test set

| Item | Approach |
|---|---|
| Size | About 100 labeled messages [Proposed], from both Shopee and TikTok |
| Labels | Correct category, priority, order ID, language |
| Source | Real messages (with Mom's consent, kept local) and synthetic messages (can be public) |
| Coverage | Every category; Chinese, English, Malay and mixed; hard cases (missing information, aggressive tone, several orders) |
| Label consistency | Relabel 20 cases after a few days and compare with the first pass |
| Growth | Add every message the system got wrong and every draft Mom rewrote |

## Triage metrics

| Metric | How it is computed | Why it matters |
|---|---|---|
| Category accuracy | Overall, per category, per language, per channel | Shows where it is weak |
| Missed-urgent rate | Share of urgent messages classified as low priority | Missing an urgent message costs more than mislabeling a normal one |
| Order ID extraction accuracy | Is the extracted ID correct | A wrong order gives a wrong reply |
| Draft acceptance rate | Share sent unchanged or lightly edited | Measures real time saved |
| Over-promises | Promises in drafts that the policy table does not support | The biggest risk; check against the policy table, then spot-check by hand |
| Cost and latency per ticket | Call cost and waiting time | Numbers to quote in interviews |

## Ingestion reliability metrics

| Metric | How it is computed |
|---|---|
| Missed-message rate | Compare messages in the platform app with messages in the inbox over a sample period |
| Duplicate rate | Duplicates caught by the unique key, and any that slipped through |
| Ingestion latency | Time from the buyer's message to its appearance in the inbox |
| Authorization health | Days until each shop authorization expires; failed token refreshes |
| Webhook vs catch-up | Share of messages found only by the catch-up pull (shows webhook gaps) |

## Comparison experiments

| Experiment | What is compared |
|---|---|
| Extraction method | Rules only, LLM, LLM with examples |
| Model | Haiku vs Sonnet: accuracy and cost |
| Effort level | Low, medium, high |
| Call design | One call vs separate classify and draft calls |
| How policy goes into the prompt | All policies vs only those for the category |

Record the prompt version, model, effort, accuracy, cost and latency for every run.

## Using an LLM as a judge

- Validate the judge first: compare its scores with human scores on 30 cases.
- For high-risk items such as over-promises, spot-check by hand as well.
- Use the batch interface for evaluation runs to lower cost (see 06).

## Reporting

- State the sample size, language mix, channel mix, and the real vs synthetic ratio.
- Include at least 3 failure cases and what changed after the fix.
- Do not overclaim: one shop and a few weeks of data support "observed in this shop in this period", not a general result.

## Acceptance checkpoints

- Week 4: test set and baseline numbers in place.
- Week 8: comparison experiments, failure analysis and real-use feedback in place.
- If a checkpoint is missed, cut scope instead of extending the schedule.
