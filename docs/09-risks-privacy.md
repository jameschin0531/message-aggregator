# 09 Risks and privacy

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| A platform does not approve API access, or approves late | No automatic intake | The manual-import track always works; the plan does not depend on approval (see 08) |
| The chat API is not open for a Malaysian shop of Mom's type | Same as above | Find out early by registering; ask the platform support |
| Platform terms restrict AI processing of buyer messages or automated replies | The integration could be limited or revoked | Read the terms before building; start read-only; never send in bulk |
| Authorization or token expires | Intake silently stops | Expiry alerts, token refresh, ingestion health check |
| Webhook delivery fails or is delayed | Missed messages | Catch-up pull; compare with the platform app; measure the missed rate |
| Draft promises something outside the policy | Mom has to honor it | Policy table, highlight promises, count over-promises in evaluation |
| Wrong order matched | Wrong information to the buyer | Show the match evidence |
| Mom sends drafts without reading | Errors reach buyers | Confirm click, edit-rate monitoring |
| Only 1 to 2 hours a day, so work drags on | Not finished | Weekly checkpoints; cut scope when behind |
| Small test set | Unreliable numbers | State the sample size; keep adding cases |
| Uneven quality across languages | Poor experience in some language | Report accuracy per language |
| Working with family | Pressure, blurred lines | Agree the scope in writing; keep a regular feedback slot; treat it as a real client relationship |
| Model prices or rules change | Out-of-date cost estimate | Spending limit; check the official pricing page |

## Buyer messages are personal data

| Topic | What to do |
|---|---|
| Before using | Explain the purpose to Mom and get her consent; she should confirm she may let a developer process buyer messages under the platform terms |
| Storage | Real data stays local or in a controlled service; never in a public repository |
| Public showcase | Synthetic data only, labeled as synthetic; real data only after de-identification |
| Sending to an external model | Strip phone numbers, addresses and names first; read the model provider's data terms [Unverified] |
| Logs | Do not log buyer names, phone numbers or addresses |
| Law | Malaysia's personal data law was amended in 2024 and the amendments came into force in stages during 2025, adding things like breach notification and a data protection officer requirement; this is from secondary sources, so read the original text; I am not a lawyer [Unverified] |

## Access and credentials

- Use each platform's official authorization flow: Mom logs in herself and approves my app.
- Do not ask for her passwords, and do not log in as her.
- Keep app keys and secrets in environment variables or a secret manager, never in the repository.
- Any documents the platforms ask for (business registration and so on) go from Mom to the platform directly; I do not keep copies. [Unverified]

## Ownership and employer

- Do not use the company's code, data, terminology or document formats.
- Use my own time and my own devices.
- Check the intellectual-property clause in my employment contract.
- Agree with Mom: the code is mine, the shop's data is hers, and agree how anonymized results may be shown in a portfolio.

## Platforms and automation

- Read-only intake first; no automatic sending in the first versions.
- Platform rules on automated messaging were not checked; one third-party guide warns that bulk automated messaging that breaks marketplace policies can lead to access restrictions [Unverified].
- Do not use unofficial WhatsApp methods; they risk account bans [Unverified].
