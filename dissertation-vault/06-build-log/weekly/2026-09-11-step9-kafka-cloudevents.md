---
tags: [build-log]
---
# Build Log — Step 9 (2026-09-11)
## Goal this period
> Replace the in-process CDI cheat-report event with a real **CloudEvent over Kafka**, so the
> report crosses a broker to the (simulated) operator — closing the last "faked" transport seam
> ([[Cheat-Report-Event]], [[Definition-of-Done]]).
## Done
- **Producer** — `CheatReportPublisher` now emits `Message<CheatReportData>` with an
  `OutgoingCloudEventMetadata` (CloudEvent 1.0: id/type/source/subject/time) on the
  `cheat-reports-out` channel → Kafka topic `cheat-reports` in **binary** mode (CloudEvent attributes as `ce_*` Kafka headers).
- **Payload** — new `CheatReportData` record (`profileId`, `connectionId`, `recordId`,
  `offenceType`, `score`, `evidenceLink`, `timestamp`); the CloudEvent `subject` is the hashed
  `profileId`. `AccountabilityService` builds it from the flagged case event.
- **Consumer** — `SimulatedOperatorReportConsumer` is now `@Incoming("cheat-reports-in")`, reads
  the payload (+ CloudEvent `type` when present), records receipt, and acks.
- **Config** — `quarkus-messaging-kafka` added; `kafka.bootstrap.servers` via env; Kafka Dev
  Services provides a broker in **dev**. **Tests** override both channels to the **in-memory
  connector** and disable Kafka Dev Services (no broker/Docker in CI).
- **Tests: 12 passing** (was 11) — the flagged-sample test now asserts a **CloudEvent** on the
  outgoing channel (payload + `type` + `subject`); a new test feeds the incoming channel and
  asserts the simulated operator consumes it. Auth + ban + clean-sample tests unchanged.
- **Verified:** `mvn test` → 12/12, `messaging-kafka` feature installed.
## Decisions & rationale
- **In-memory connector for tests** — keeps the suite broker-free and fast (matches the project's
  "no brokers in tests" stance) while still exercising the emit→consume flow and CloudEvent metadata.
- **Binary CloudEvents** — the payload is the record value (Jackson) and the CloudEvent attributes
  (`ce_id`/`ce_type`/`ce_source`/`ce_subject`/`ce_time`) ride as Kafka headers. This keeps the typed
  producer/consumer and the auto-generated serdes working; structured mode needs a `StringSerializer`
  and hand-rolled data (de)serialization, which the typed consumer path did not support cleanly.
- **Kept the simulated operator in-module** — validates the transport end-to-end without standing
  up a separate service yet; it consumes from Kafka exactly as an external operator would.
- **Producer/consumer split into two channels** on one topic — the idiomatic SmallRye shape and it
  makes the two halves independently testable.
## Blockers / caveats
- **Dual-write**: the emit happens inside the sample transaction, so a broker failure after commit
  could drop a report. A transactional **outbox** for exactly-once is noted as future work.
- **Real-Kafka serde** (binary CloudEvent headers + Jackson value) is validated in dev (verified end-to-end: flagged sample → Kafka → operator consume); the test gate uses the in-memory connector.
- **Dev needs Docker** for Kafka Dev Services (tests do not).
## Where we are vs the spec ([[Definition-of-Done]])
The cheat-report join point is now **built on the target transport**: flagged sample → CloudEvent
→ Kafka → simulated operator. Both MVP-pipeline report lines are ticked. Remaining open item:
scorer **offence taxonomy** so case events aren't fixed to `aimbot`.
## Next
- **Offence taxonomy**: have the detection-engine return an offence type; carry it through the
  score → case event → CloudEvent so `CaseEvent.offenceType` is real.
## Links
- [[Cheat-Report-Event]] · [[platform-module]] · [[Data-Model]]
- [[Definition-of-Done]] · [[ToDo]] · [[2026-09-11-step8-portal-login]]
