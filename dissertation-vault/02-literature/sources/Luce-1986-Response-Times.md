---
tags: [source]
---
# Luce (1986) — Response Times

## Citation
Luce, R.D. (1986) *Response Times: Their Role in Inferring Elementary Mental
Organization*. New York: Oxford University Press.

(Supporting reference: "Mental chronometry", Wikipedia, for the ex-Gaussian /
right-skew summary — https://en.wikipedia.org/wiki/Mental_chronometry)

## Type
`book`

## Key points
- Human reaction-time (RT) distributions are **positively (right) skewed**, not normal —
  a Gaussian bulk with a long right tail.
- The tail is driven partly by **momentary attentional lapses**; the raw mean is a poor
  summary of "typical" RT — model the whole distribution.
- Commonly modelled as **ex-Gaussian** (Normal + Exponential) or via diffusion models.

## How it supports my argument
Feeds the [[Synthetic-Data]] realism model and SQ1 ([[Research-Questions]]). Justifies
generating `reactionTimeMs` as `N(μ,σ) + Exp(τ)` rather than a symmetric normal, so
legitimate human reaction times have a realistic skew that **overlaps** with fast/cheating
values — making detection non-trivial and the low-FPR target meaningful ([[Evaluation]]).

## Quotes / data (with page numbers)
> Typical simple visual RT ~250–270 ms; elite ~150–200 ms; physiological floor ~100–120 ms
> (below which responses reflect anticipation, not reaction). (add page refs on full read)

## My critique
Lab RT paradigms are simpler than in-game stimuli (context, prediction, aim coupled with
decision). Values are indicative, not game-measured — consistent with the synthetic-data
caveat that this shows feasibility, not validated real-world accuracy.

## Links
- [[Literature-Review]] · [[Synthetic-Data]] · [[Features]]

