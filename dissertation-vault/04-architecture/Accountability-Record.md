---
tags: [architecture, design]
---
# Accountability Record

The **spine** of the platform (see [[Scope-and-Management]]). The platform keeps one verified profile, then one accountability record per linked game account (game/operator connection). Every signal — the platform's **own conduct detection** and **ingested external anti-cheat verdicts** — lands here, on **one identity**, with an **append-only audit trail**. Owned by [[platform-module]] and stored in Postgres.

## Schema

| Field | Type | Notes |
|-------|------|-------|
| `profileId` | string (hashed) | Shared verified profile id — never raw identity. See [[Identity-Model]]. |
| `connectionId` | string | Linked game/operator account id (one per game/operator pair). |
| `operatorId` | string | Game operator that owns this account connection. |
| `gameId` | string | Game this record belongs to. |
| `conductScore` | integer 0–100 | Latest calibrated **conduct (toxicity)** score for this game connection. |
| `caseHistory[]` | list | Append-only offence/case events (conduct **and** ingested cheat verdicts) for this game only. |
| `auditTrail[]` | list | Append-only audit entries: source (my-engine \| anti-cheat vendor \| operator), action, actor, timestamp, evidence ref. |
| `evidenceRefs[]` | list | Secure links to evidence (chat/voice refs, vendor evidence), not raw evidence. |
| `status` | enum | `pending` \| `confirmed` \| `appealed`. |

```json
{
  "profileId": "sha256:…",
  "connectionId": "gc-123",
  "operatorId": "op-1",
  "gameId": "game-a",
  "conductScore": 0,
  "caseHistory": [],
  "auditTrail": [],
  "evidenceRefs": [],
  "status": "pending"
}
```

## Each case event carries its source
A `CaseEvent` records **how it was detected**, so the record is honest about provenance:
- **Conduct** (`chatAbuse`, `voiceAbuse`) — from the built [[ml-module|conduct engine]]; created `pending` (human review).
- **Cheat** (`aimbot`, `wallhack`, …) — from an external anti-cheat via [[Anti-Cheat-Integration]]; created `confirmed` (vendor trusted), appealable.

## Global vs per-game
- **Per-game:** `conductScore`, `status`, `caseHistory[]` and `auditTrail[]` are scoped to one `connectionId`.
- **Global:** trust is calculated at `profileId` level across all linked records.
- **Cross-game visibility:** games can query warning summaries (confirmed offences / active bans) from other linked games — so a **cheat ban, chat ban or voice ban in one game shows on the player's account everywhere**.
- **Ban feedback:** a ban from one game is ingested as `ExternalBan` and decreases global trust.

## Status lifecycle
- **pending** — flagged by the conduct engine, awaiting human review (nothing confirmed).
- **confirmed** — upheld after human review, **or** an auto-confirmed external anti-cheat verdict.
- **appealed** — under appeal (applies to both conduct and cheat cases). See [[Governance]].

> Conduct findings are confirmed only after human review; external cheat verdicts are
> recorded confirmed but remain **appealable**. Everything is **audited**.

> `caseHistory[].offenceType` uses the shared [[Data-Model#`OffenceType` values|`OffenceType`]]
> enum; full field contracts for the record are in [[Data-Model#Contract 2 — Accountability Record platform ↔ Postgres|Data-Model]].

## Related
- [[Cheat-Report-Event]] · [[Anti-Cheat-Integration]] · [[platform-module]] · [[Identity-Model]] · [[Governance]]
- [[Game-Operator-Integration]]

