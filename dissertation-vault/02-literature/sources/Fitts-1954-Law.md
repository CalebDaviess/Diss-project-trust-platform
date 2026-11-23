---
tags: [source]
---
# Fitts (1954) — Fitts's Law

## Citation
Fitts, P.M. (1954) 'The information capacity of the human motor system in controlling the
amplitude of movement', *Journal of Experimental Psychology*, 47(6), pp. 381–391.
doi:10.1037/h0055392.

(Supporting reference: "Fitts's law", Wikipedia —
https://en.wikipedia.org/wiki/Fitts%27s_law)

## Type
`journal`

## Key points
- **Movement time** to acquire a target increases with the **index of difficulty**
  `ID = log2(2A/W)` (A = amplitude/distance, W = target width): `MT = a + b·ID`.
- Rapid aimed movements are **ballistic-then-corrective**: an initial fast phase that
  typically **overshoots**, followed by **micro-corrections** onto the target.
- Skill reduces movement time and correction magnitude, but the corrective structure
  remains for genuine human aiming.

## How it supports my argument
Feeds the [[Synthetic-Data]] aim model and SQ1 ([[Research-Questions]]). Justifies:
- `aimSnapSpeed` rising and `aimOvershoot` falling with skill (better players are faster,
  overshoot less) — so **elite humans approach aimbot-like snap** on that one feature;
- modelling **aimbots as skipping the corrective phase** (overshoot → ~0, near-instant
  snap). The detectable difference is therefore in the **combination** (snap + overshoot +
  timing), not snap alone.

## Quotes / data (with page numbers)
> `MT = a + b·log2(2A/W)` — the index-of-difficulty formulation (Shannon form:
> `ID = log2(A/W + 1)`). (p. 381–391)

## My critique
Classic HCI pointing law; in-game aiming adds prediction, tracking and recoil not captured
by a single flick model. Used here as a principled shape for the synthetic features, not a
claim of exact in-game fidelity.

## Links
- [[Literature-Review]] · [[Synthetic-Data]] · [[Features]]

