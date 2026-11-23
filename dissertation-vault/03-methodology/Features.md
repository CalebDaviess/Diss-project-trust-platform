---
tags: [methodology, empirical]
---
# Features

## Intro
Conduct features are the inputs to the detection engine and represent signals that could help
separate **toxic** conduct from robust-but-acceptable **competitive banter** (SQ1). In the current
experiment, these are **synthetic numerical proxies**, not values extracted from real chat or
voice. The prototype does not tokenize messages, transcribe speech or analyse audio. This
distinction is important when interpreting the evaluation ([[Synthetic-Data]]).

## Feature families (to engineer & justify)
### Lexical proxies
- **`toxicityLexiconScore`** — a generated proxy score for lexical toxicity; no lexicon is run over real text.
- **`severityWeighted`** — a generated severity proxy; it does not evaluate actual words.

### Targeting proxy
- **`targetedHarassment`** — a generated proxy for directed conduct; it does not infer intent from a real message.

### Structural proxies
- **`capsRatio`** — generated proxy for capitalization/shouting.
- **`repetitionRate`** — generated proxy for repeated conduct.
- **`messageBurstRate`** — generated proxy for rapid message bursts.

### Channel
- **`channel`** — `text` or `voice` metadata used to label the sample and map a flagged sample to
  `chatAbuse` or `voiceAbuse`. It is not a model feature. The simulated voice channel adds
  numerical noise; it does not contain acoustic measurements.

> These features are the **initial, justified set** exposed on the `POST /score`
> contract ([[Data-Model#Contract 1 — POST /score platform → ml|ConductFeatureVector]]).
> The set may be refined during engineering, but every addition must carry a justification.

## Justification principle
The feature names are motivated by conduct-detection literature, but their values are generated
from assumptions rather than extracted from people. The experiment can test model behaviour on
those assumptions; it cannot establish that the proxies reliably identify real abuse or protect
real banter. That requires future validation on appropriately sourced, consented data.

## Current implementation
Transform layer: `detection-engine/src/detection_engine/features.py`. It loads the generated
dataset ([[Synthetic-Data]]) and prepares its numerical columns for the models ([[Models]]):

- **`load_dataset()`** — read `data/sample/conduct_dataset.csv` (clear error if not generated).
- **`select_features()`** — return the six conduct features **in canonical order** (`constants.FEATURE_NAMES`) so training and the `POST /score` API see identical vectors ([[Data-Model#Contract 1 — POST /score platform → ml|Contract 1]]).
- **`make_split()`** — stratified train/test split preserving class balance — important for the low-FPR target in [[Evaluation]].
- **scale** — fit numerical scaling on the training data only to avoid leakage. No text vectorisation is performed.

No raw messages, transcripts or audio are processed by this transform layer.

## Related
- [[Synthetic-Data]] · [[Models]] · [[Evaluation]]
