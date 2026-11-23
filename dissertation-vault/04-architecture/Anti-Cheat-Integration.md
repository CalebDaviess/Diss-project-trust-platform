---
tags: [architecture, integration]
---
# Anti-Cheat Integration

**The anti-cheat hook — built integration, external detection.** The platform **does not detect cheating**. Instead it connects to **existing third-party anti-cheat systems** and records their verdicts on the player's single, audited accountability record — so a player caught cheating *on this game, by this anti-cheat, at this time, for this offence* is captured and carried across every linked game.

## Why external
Signature/kernel and behavioural anti-cheats (EAC, BattlEye, Vanguard-style, and ML-based services) are mature, specialised products. Re-building one is neither necessary nor the contribution of this project. The contribution is **unifying, auditing and governing** their verdicts against **one verified identity**, alongside the platform's own conduct detection.

## Direction & transport
Verdicts are **pushed to the platform** (the platform never has to poll a vendor):

- **Primary: inbound REST webhook** — `POST /anti-cheat-verdicts` (see [[Data-Model#Contract 3b — POST /anti-cheat-verdicts anti-cheat → platform|Contract 3b]]). The anti-cheat (or the game operator relaying it) calls this endpoint the moment a ban/detection occurs.
- **Demo: in-module simulated anti-cheat vendor** — mirrors the existing simulated operator, so the end-to-end pipeline runs without a real vendor. It emits sample verdicts the webhook handler ingests.
- Optional future: an **inbound Kafka topic** (`anti-cheat-verdicts`) for vendors that prefer events — reuses the existing bus, direction-flipped.

## Verdict payload (what we capture)
Minimum fields needed for accountability, never raw identity or raw evidence:

| Field | Meaning |
|-------|---------|
| `profileId` | Hashed platform identity the verdict attaches to. |
| `connectionId` / `operatorId` / `gameId` | Which game/account the cheat happened on. |
| `antiCheatVendor` | **Which anti-cheat** made the call (e.g. `vendor-eac`, `vendor-battleye`). |
| `offenceType` | Cheat offence (`aimbot` · `triggerbot` · `wallhack` · `scripting`). |
| `confidence` | Vendor-reported confidence (0–1), stored for audit/critique. |
| `detectedAt` | When the anti-cheat caught it. |
| `evidenceRef` | Secure reference to the vendor's evidence (never raw). |

## Processing rule (auto-confirmed, appealable)
Because the verdict is produced by a **trusted specialist**, the platform does **not** re-adjudicate detection:

1. Validate the payload + vendor identity.
2. Append a `CaseEvent` to the per-game [[Accountability-Record]] with `status = confirmed` and `offenceType` = the cheat type.
3. Write an **audit entry** (vendor, offence, confidence, timestamp, evidence ref).
4. Recalculate **global trust** and refresh cross-game warning summaries.
5. The player may **appeal** → `status = appealed` → human re-review ([[Governance]]).

> **Contrast with conduct.** The platform's *own* conduct detector only ever produces a
> `pending` flag for human review; an external anti-cheat verdict is recorded `confirmed`.
> This **detection-source asymmetry** is examined in [[Governance]] and is a key SQ3 critique
> ([[Research-Questions]]).

## Privacy & security
- `profileId` is always a **hashed token**; raw identity is never shared.
- Evidence stays as **secure references**, not raw media/logs.
- The endpoint is authenticated per vendor (shared secret / signed request) — designed; the demo trusts the simulated vendor.

## Related
- [[Cheat-Report-Event|Offence Reporting & Anti-Cheat Ingest]] · [[Accountability-Record]]
- [[Game-Operator-Integration]] · [[Governance]] · [[Data-Model]]
- [[Architecture-Overview]]

