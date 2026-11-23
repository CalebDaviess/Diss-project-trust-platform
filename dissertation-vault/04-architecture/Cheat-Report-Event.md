---
tags: [architecture, empirical]
---
# Offence Reporting & Anti-Cheat Ingest

**The join points — built.** The platform meets the outside world through **two offence seams**, in opposite directions. *(This note keeps the `Cheat-Report-Event` filename only to preserve wikilinks; its subject is now the conduct report plus a pointer to anti-cheat ingest.)*

1. **Outbound — conduct report (my engine → operator).** When a synthetic numerical feature sample receives a conduct flag from the built [[ml-module|conduct-detection engine]], the backend (`accountability-service/`) builds a **CloudEvent** conduct-report and publishes it to **Kafka** (topic `conduct-reports`, binary mode via SmallRye Reactive Messaging — CloudEvent attributes ride as Kafka headers), where an in-module simulated operator consumes it.
2. **Inbound — anti-cheat verdict (external anti-cheat → my platform).** Cheating is **not** detected here; a third-party anti-cheat pushes a verdict to `POST /anti-cheat-verdicts`, which the platform records as an **auto-confirmed, appealable** case. Full detail: [[Anti-Cheat-Integration]].

> **Implementation (outbound).** Producer: `ConductReportPublisher` emits `Message<ConductReportData>` + `OutgoingCloudEventMetadata` on the `conduct-reports-out` channel. Consumer: `SimulatedOperatorReportConsumer` `@Incoming("conduct-reports-in")`. In **dev** a broker starts via Kafka Dev Services; **tests** swap both channels to the **in-memory connector** (no broker/Docker) and assert the emitted CloudEvent + the consumer handling one.

## CloudEvent (outbound conduct report)
- **type:** `com.trustplatform.conduct.reported`
- **data:** `{ offenceType, score, evidenceLink, timestamp }`

In the prototype, the event carries a **demo identity token + conduct offence type + score + synthetic evidence reference**. It contains no participant data or real chat/voice evidence. A production design would require a separately assessed identity and evidence-handling model.

```json
{
  "specversion": "1.0",
  "type": "com.trustplatform.conduct.reported",
  "source": "/accountability-service/case-engine",
  "id": "<uuid>",
  "time": "2026-01-01T12:00:00Z",
  "subject": "sha256:<hashedPlayerId>",
  "data": {
    "offenceType": "chatAbuse",
    "score": 92,
    "evidenceLink": "https://evidence.example/secure/<ref>",
    "timestamp": "2026-01-01T12:00:00Z"
  }
}
```

## Detection-source asymmetry (important)
- **Conduct offences** (`chatAbuse`, `voiceAbuse`) are detected **here**, so the engine only ever produces a **pending** flag → human review before anything is confirmed ([[Governance]]).
- **Cheat offences** (`aimbot`, `wallhack`, …) arrive **already adjudicated** by a specialist anti-cheat vendor, so they are recorded **auto-confirmed** (vendor is trusted) and remain **appealable** afterwards ([[Anti-Cheat-Integration]]).

## Delivery guarantee
The conduct report is delivered to the simulated operator via Kafka. **Note:** the emit happens inside the sample transaction (dual-write); a transactional **outbox** to guarantee exactly-once is noted as future work. Consumer-side dedupe/idempotency covers redelivery.

> `offenceType` is the shared enum defined in [[Data-Model#`OffenceType` values|Data-Model]] —
> conduct values (`chatAbuse` · `voiceAbuse`) here, cheat values (`aimbot` · `triggerbot` ·
> `wallhack` · `scripting`) on the ingest side.

## Related
- [[Anti-Cheat-Integration]] · [[Accountability-Record]] · [[platform-module]] · [[Evaluation]] · [[Governance]]
