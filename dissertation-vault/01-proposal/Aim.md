---
tags: [proposal]
---
# Aim

> [!abstract] Aim
> Design and build a **third-party trust and accountability platform** for online gaming that gives each player **one verified identity** carrying a **portable reliability (trust) score** across every linked game, and that **ingests, audits and governs** safety signals from many sources so that other games can **check a player's reliability**, **age-appropriate access** is enforced, and outcomes stay **fair and appealable**. The emphasis is the **platform and the online-safety outcomes it controls** — not any single detection model. Harassment (text/voice) detection and external anti-cheat verdicts are **signals that feed the platform**, not its headline.

## Why it matters
- **Accountability is fragmented across games.** A player banned or reported for cheating or abuse in one game simply **starts fresh** in the next. There is no portable record of whether a player is reliable.
- **Cheat detection is already a mature third-party market** (kernel/behavioural anti-cheats). The unmet need is not re-building a detector but **unifying, auditing and governing** verdicts from many sources against one identity.
- **Online harassment** (text and voice) drives churn and real-world harm, and like cheating it is rarely tracked *across* game boundaries.
- Child-safety **regulation is tightening** (Online Safety Act 2023, ICO Children's Code), so **age-appropriate access** to older/age-restricted games matters.

## What it is
An independent **third-party platform**, operating outside individual games, whose job is **online safety and accountability**. It:
1. Gives each player **one verified identity** with an **audited accountability record** and a **portable trust score** that other games can **check before letting the player in** (**built**).
2. **Ingests external anti-cheat verdicts** (aimbot, wallhack, scripting, …) and **operator bans**, recording them on that identity (**built integration; detection stays external**).
3. Enforces **age-appropriate access**, so younger players are kept out of older/age-restricted games (**designed, with a demo**).
4. **Governs** outcomes fairly — human-reviewed appeals and a documented audit trail before any lasting sanction (**record + audit built; verification/appeals designed & critiqued**).
5. Includes a **conduct-classification feature** using synthetic numerical proxies for text/voice conduct as **one signal feeding the record**; no real messages, transcripts or audio are processed.

## What it solves
Fragmented accountability across games, repeat-offender evasion, smurfing, ban-evasion, underage access, and unchecked harassment — by making **one identity's reliability portable and auditable**. Cheating and harassment are both **captured and recorded**, but **detecting cheating is delegated to specialised third-party anti-cheats**, and **harassment detection is a feature on top**, not the point.

## The halves of the project
- **Built & evaluated (the platform):** the **single-identity accountability record + audit trail**, the **portable cross-game trust score**, the **anti-cheat verdict and operator-ban ingestion**, the governance/report seam, and the **player-facing portal**. The **synthetic-feature conduct classifier** is evaluated as one input; real communication processing is out of scope.
- **Designed & critiqued:** identity *verification*, age assurance (with a UI demo), and the governance/appeals workflow.

## Related
- [[Research-Questions]]
- [[Objectives]]
- [[Scope-and-Management]]
- [[Architecture-Overview]]
- [[Anti-Cheat-Integration]]
