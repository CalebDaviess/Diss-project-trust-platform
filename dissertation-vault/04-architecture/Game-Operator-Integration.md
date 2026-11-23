---
tags: [architecture, integration]
---
# Game-Operator Integration

How game operators integrate with the platform identity/accountability model.

## Core model
- One verified player profile exists in the platform (`profileId`).
- Each game/operator links exactly one account for that profile (`connectionId`).
- Offence and case history are stored per game connection.
- Trust score is global at profile level across all linked games.

## Integration flows
1. **Account link (player-initiated)** — the player links a game from the portal's **Games** tab: they search a live catalogue (Steam store search plus a curated non-Steam set covering Epic / Riot / Battle.net etc.), pick a title, and **Connect**. Connecting mints a `connectionId` against their `profileId`. A real deployment finishes the link with a lightweight **publisher-OAuth hand-off** (the operator confirms account ownership); the prototype mocks that consent step so no operator credentials are needed to demo the trust model.
2. **Conduct report** — the prototype sends a **conduct-report** event based on a synthetic feature sample for a specific demo game connection; it does not report real chat or voice content ([[Cheat-Report-Event|Offence reporting]]).
3. **Anti-cheat verdict ingest** — the operator's (or its anti-cheat vendor's) cheat detections are **pushed to the platform** via `POST /anti-cheat-verdicts` and recorded auto-confirmed + appealable ([[Anti-Cheat-Integration]]).
4. **Warning query** — operator can request a cross-game warning summary before/after matches.
5. **Ban feedback** — if the operator bans the account, the ban outcome is sent back to the platform. The operator declares the **ban type**, its **extent** (duration or permanent), and whether it is **appealable** — the platform does not decide appealability, it honours the operator's flag.
6. **Trust update** — platform persists the ban/verdict event, audits it, recalculates global trust, and **appends a trust-history point** so the change is visible on the player's trust-over-time graph.

## Cross-game warning summary
Returned to games as minimal risk signals (not full evidence):
- `confirmedOffenceCount`
- `hasActiveBan`
- optional source `operatorId` / `gameId`

## Ban feedback contract
```json
{
  "profileId": "sha256:...",
  "connectionId": "gc-123",
  "operatorId": "op-1",
  "gameId": "game-a",
  "reason": "aimbot confirmed",
  "banType": "permanent",
  "appealable": false,
  "bannedAt": "2026-01-03T09:00:00Z",
  "expiresAt": null,
  "trustDelta": -35
}
```
- `banType` — e.g. `communication`, `temporary`, `permanent`; drives how the ban is labelled and how its extent is shown.
- `appealable` — operator-set. A non-appealable ban is surfaced to the player as read-only ("set by the game, not appealable") and is rejected by the appeal endpoints.

## Notes
- `profileId` is a hashed token; raw identity is never shared.
- Evidence stays as secure references, not raw media.
- Cross-game signals are warning-level summaries for proportional use.

## Related
- [[Architecture-Overview]] · [[Data-Model]] · [[Accountability-Record]] · [[Identity-Model]]
- [[Anti-Cheat-Integration]] · [[Cheat-Report-Event]]
