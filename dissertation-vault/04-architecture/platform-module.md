---
tags: [architecture]
---
# accountability-service module

**Quarkus / Java backend — built.** Code lives in the repo's [`accountability-service/`](../../accountability-service/) folder.

## Responsibility
Own verified-profile ↔ game-operator account linking, own each per-game [[Accountability-Record]] and its **append-only audit trail**, maintain profile-level global trust, orchestrate **conduct** scoring/threshold-case logic, **ingest external anti-cheat verdicts**, publish the [[Cheat-Report-Event|conduct-report CloudEvent]], ingest operator ban outcomes, and serve cross-game warning signals. This module is the **governance and audit backbone** — it is agnostic to *how* an offence was detected (its own conduct engine vs a third-party anti-cheat) and records every signal identically.

## Flow
1. Receive authenticated (JWT/OIDC) requests from [[web-module]].
2. Call [[ml-module]] `POST /score` for **conduct** feature vectors; the current evaluation uses synthetic samples only.
3. Update the per-game [[Accountability-Record]] in **Postgres** (schema managed by **Flyway**); append to that game's case history **and the audit trail**.
4. Compare the conduct score to the **reporting threshold** (from [[Evaluation]]).
5. On a conduct breach: mint a **hashed identity token**, build a [[Cheat-Report-Event|conduct-report CloudEvent]], publish **once** to **Kafka** → `pending` (human review).
6. An **in-module simulated operator** consumes and acknowledges the event.
7. **Ingest external anti-cheat verdicts** (`POST /anti-cheat-verdicts`, [[Anti-Cheat-Integration]]): record an **auto-confirmed, appealable** cheat `CaseEvent`, append an audit entry, recalculate global trust.
8. Ingest operator ban outcomes (`POST /ban-notifications`), append ban feedback + audit entry, recalculate global trust, and expose cross-game signal summaries to the web module.

## Stack
Java · Quarkus · Postgres · Flyway · Kafka · OIDC/JWT.

## Contracts it exposes / consumes ([[Data-Model]])
- Exposes: [[Data-Model#Contract 0 — POST /auth web → platform|`POST /auth`]],
  [[Data-Model#Contract 3a — POST /ban-notifications operator → platform|`POST /ban-notifications`]],
  [[Data-Model#Contract 3b — POST /anti-cheat-verdicts anti-cheat → platform|`POST /anti-cheat-verdicts`]],
  [[Data-Model#Contract 4 — POST /samples web → platform|`POST /samples`]],
  [[Data-Model#Contract 5 — results view platform → web|`ResultView`]] (GET results).
- Consumes: [[Data-Model#Contract 1 — POST /score platform → ml|`POST /score`]] on [[ml-module]].
- Emits: [[Data-Model#Contract 3 — Conduct-Report CloudEvent platform → Kafka → operator|conduct-report CloudEvent]].

## Related
- [[Accountability-Record]] · [[Cheat-Report-Event]] · [[Anti-Cheat-Integration]]
- [[Governance]] · [[Identity-Model]]
- [[Architecture-Overview]]
