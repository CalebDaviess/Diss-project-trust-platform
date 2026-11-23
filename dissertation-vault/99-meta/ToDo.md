---
tags: [meta, todo]
---
# ToDo

Living task list. Use `#todo` in any note to surface tasks here (via search/tag).

## ✅ Current scope — synthetic conduct core + external anti-cheat
The empirical core is **conduct classification on synthetic numerical features** plus **anti-cheat verdict ingestion**. The prototype does not process real chat/audio, connect to live games or use real identity providers.
- [x] Re-point `detection-engine` from cheat → **conduct** (dataset, features, models, evaluate) → [[ml-module]], [[Synthetic-Data]], [[Features]], [[Models]], [[Evaluation]] — ROC-AUC 0.974, recall 86.7%, FPR 4.7%
- [x] Add **anti-cheat verdict ingest** `POST /anti-cheat-verdicts` + simulated vendor (auto-confirmed, appealable, audited) → [[Anti-Cheat-Integration]]
- [x] Record changes: `suspicionScore`→`conductScore`, add `auditTrail` + `CaseEvent.source` → [[Accountability-Record]], [[Data-Model]]
- [x] Rename Kafka `cheat-reports`→`conduct-reports`, event type `com.trustplatform.conduct.reported` → [[Cheat-Report-Event]]
- [x] Portal: conduct sample presets + audit trail + source tags → [[web-module]]
- [ ] Rename folder `detection-engine/` → `conduct-detection-engine/` and update root [README](../../README.md) (deferred — cosmetic; would touch ~30 wikilinks + dev.sh) #todo
- [x] Set synthetic numerical feature generation as the only current model-data approach; exclude public-corpus rows, real chat/audio and ASR → [[Synthetic-Data]], [[Features]]

## Platform-first front end (player-facing dashboard)
- [ ] Rebuild portal so sign-in lands the player on an **account dashboard**: trust score + accountability record (past bans/reports/audit trail) are the hero; conduct-sample submission becomes a secondary/demo panel → [[web-module]] #todo
- [ ] **Dev demo data**: the dev account uses the *exact same* setup a real player gets, so it starts with **no connected games**. For the demo, simulate connecting **two games with history** for that player (bans/reports/audit across both) so the cross-game record shows working. Dev testing only, add later. #todo
- [ ] Build a working **age-appropriate access** demo (not the core driver) #todo

## Ethics & submission
- [x] Update the ethics application and participant information, consent and withdrawal documents for the current synthetic-feature platform and anonymous survey → `09-ethics`, `10-SurveyForms`
- [x] Add the approved role/eligibility screener and one example attitude question to the application; the full questionnaire is not yet drafted.
- [x] Include an optional local Docker demo and anonymous exploratory feedback as an opt-in activity in the ethics description and participant sheets.
- [ ] Package and check the local Docker demo (synthetic accounts/data only), then add its link and optional feedback items to Microsoft Forms before recruitment.
- [ ] Confirm the 10-year retention period and the applicable policy with the supervisor.
- [ ] Ask the supervisor to complete prior participant-research experience; obtain applicant and supervisor signatures/dates.
- [ ] Complete and attach the full survey questionnaire if required; verify final Microsoft Forms settings and participant documents.
- [ ] Submit the application and wait for approval before recruiting or collecting data.
- [ ] Create [[Age-Assurance]] note (referenced from [[Research-Questions]] SQ2) #todo

## Now
- [ ] Fill [[Literature-Review]] with real sources (use [[_source-template]]) #todo
- [x] Align architecture docs to verified-profile + linked game-account model → [[Data-Model]], [[Architecture-Overview]], [[Identity-Model]], [[Accountability-Record]], [[Game-Operator-Integration]]
- [x] Generate synthetic dataset → [[Synthetic-Data]]
- [x] Engineer features → [[Features]]

## Next
- [x] Train & compare ≥3 models → [[Models]]
- [x] **Make synthetic data realistic** (latent skill/strength, ex-Gaussian, Fitts) → [[Synthetic-Data]], [[Models]]
- [x] Evaluate + tune threshold → [[Evaluation]], [[Results]]
- [x] Persist tuned threshold in artifact + expose `flagged` on `/score` → [[Data-Model#Contract 1 — POST /score platform → ml|Contract 1]]
- [x] accountability-service slice: persist per-game record + case history on flagged samples → [[platform-module]], [[2026-08-24-step5-accountability-service]]
- [x] `POST /ban-notifications`: ingest operator bans, update global trust, confirm pending cases → [[Data-Model#Contract 3a — POST /ban-notifications operator → platform|Contract 3a]]
- [x] In-process cheat-report event + simulated operator consumer → [[Cheat-Report-Event]]
- [x] **Wire `player-portal`** to `POST /samples` + `GET /results/{connectionId}` (trust, case history, cross-game warnings) → [[web-module]], [[2026-08-24-step6-player-portal]]
- [x] `POST /auth` (JWT issue) + backend resolves identity from JWT `sub` (prod = JWT-only; bcrypt credential store) → [[Identity-Model]], [[Data-Model#Contract 0 — POST /auth web → platform|Contract 0]], [[2026-09-11-step7-jwt-auth]]
- [x] **Wire portal login**: `POST /auth` sign-in form in `player-portal`, stores the JWT, sends `Authorization: Bearer` (no `X-Profile-Id`) → [[web-module]], [[2026-09-11-step8-portal-login]]
- [x] Replace in-process event with **CloudEvent envelope + Kafka** delivery → [[Cheat-Report-Event]], [[2026-09-11-step9-kafka-cloudevents]]
- [x] Scorer returns **offence taxonomy** (second RF head, ~0.91 acc) so `CaseEvent.offenceType` is real, not fixed to `aimbot` → [[Data-Model#`OffenceType` values|OffenceType]], [[Models#Offence taxonomy — a second classifier head]]
- [ ] Concept UI journeys (identity / age / governance) fleshed out in portal → [[web-module]] #todo

## Later
- [ ] Web prototype (auth + results + case history) → [[web-module]] #todo
- [ ] Concept UI (identity / age / governance) #todo
- [ ] Optional survey + ethics approval #todo

## Future work (discussion / not built)
- [ ] **Continuous-learning feedback loop** (conduct): persist scored samples, add `POST /feedback` to capture human-verified labels, and union corpus + verified-real rows for retraining → [[Models#Continuous learning (AI-driven, improves over time)]] #todo
- [ ] Richer **voice** modelling (prosody/acoustic beyond transcript) + bias/fairness hardening → [[Results#Future work]] #todo
- [ ] More **anti-cheat vendor adapters** + real vendor auth → [[Anti-Cheat-Integration]] #todo
- [ ] Validate on authentic, consented game chat/voice #todo

## Writing
- [ ] Keep [[Word-Budget]] on track #todo

## Related
- [[Definition-of-Done]] · [[Objectives]] · [[Home]]
