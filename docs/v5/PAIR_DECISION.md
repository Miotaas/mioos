# MioOS V5 — Pair Decision After Tests A–D

3 Sep 2026. Supersedes the English ← Japanese recommendation in `PAIR_SELECTION.md`.
**NOT approved for build.** Full document: https://claude.ai/code/artifact/e6b0cea2-fac4-4ad8-a022-1addad6887ec

Tests run: **B partial · C complete · D complete · A blocked.**

---

## TEST C FAILED — English ← Japanese is dead

**The source-segmentation thesis was falsified cleanly.** [MEASURED]

Japanese-language guides for Japanese learners of English recommend **native English-speaker channels**: Listening Time, VOA Learning English, BBC Learning English, English with Lucy, TED, TED-Ed, Kurzgesagt. The Japanese framing lives on the **curation blogs**, not on the channels. Learners consume English-only content and use Japanese-language sites to decide what to watch.

Confirmed terminology: 多読 (tadoku, extensive reading), リスニング, 能動的リスニング, シャドーイング, ディクテーション. Japan has a **mature extensive-input culture** — but it consumes authentic English with bilingual subtitles and speed control, not Japanese-made English lessons.

**Consequence:** there is no Japanese-framed channel to build. You'd be building a generic English CI channel against VOA, the BBC and institutionally funded incumbents. The replication argument that made English ← Japanese the winner collapses with the thesis.

---

## TEST B — the elimination was based on a stale model

**ElevenLabs v3 (released February 2026): 70+ languages, Japanese/Korean/Chinese in the "Excellent" tier, available via API as `eleven_v3`.** [MEASURED — vendor-adjacent source]

The "Poor" rating that eliminated CJK almost certainly evaluated **Multilingual v2**, which covered 28 languages. You were right to refuse a single-source elimination.

Also found: v2 is still *preferred for neutral narration* — v3's gain is emotional range and language breadth. Google Chirp 3 HD and Azure both offer **SSML phoneme control via IPA**, which ElevenLabs does not — relevant for a pedagogical product.

### The decisive linguistic fact

**Mandarin tones and Japanese pitch accent are lexically contrastive. Korean prosody is not.**

A TTS prosody error in Mandarin changes the word. In Japanese it changes the word — 箸 (hashi, chopsticks) and 橋 (hashi, bridge). In Standard Seoul Korean it changes nothing semantic.

**Korean is the one CJK target where the unresolved pitch-accent question does not apply at all.** This reorders the group on a structural property rather than a benchmark score.

---

## Revised Top 3

| | **#1 Korean ← English** | #2 Italian ← English | #3 Japanese ← English |
|---|---|---|---|
| Demand | Top-6 · **2nd fastest-growing in 7 countries** (FR, DE, MX…) | Top-7, stable | Top-4, anime-driven, durable |
| Learner geography | US, UK, EU, SEA | US, UK, DE | US, UK, AU — highest RPM |
| Supply | Thin, mediocre, none dominant | Moderate, podcast-led | Thin true-CI |
| **Prosodic risk** | **NONE** | **NONE** | **HIGH — lexically contrastive** |
| Script barrier | **Hangul — hours.** Beginners engage immediately | Latin | Three scripts, months |
| TTS readiness | v3 Excellent · Chirp 3/Azure with IPA control | Best available | v3 Excellent, risky property unmeasured |
| Monetisation | Deep — apps, tutoring, K-culture adjacency | Thinner | Deep |

**Replication is now weak for all three**, because the source-segmentation model that made it strong is dead. Stage 6's "property #2 in under 45 days" is harder than it looked yesterday. What carries across is the pipeline, not the target-language work.

---

## Test D — QA architecture (designed, not implemented)

```
GENERATE script (LLM, graded to level)
   │
   ├─ 1. AUTOMATED LINGUISTIC VALIDATION
   │     second-model grammar/naturalness cross-check
   │     vocabulary vs TOPIK level list
   │     sentence length + subordination metrics
   │     → catches grammar errors, register slips, over-level vocab
   │
   ├─ 2. PRONUNCIATION VALIDATION (round-trip)
   │     TTS output → Whisper ASR → diff vs source script
   │     → catches phoneme errors, misread numerals, foreign words
   │     → MISSES everything prosodic (ASR is robust to prosody
   │       by design, so wrong-sounding audio passes)
   │
   ├─ 3. PEDAGOGICAL VALIDATION
   │     % vocab within level · new-word rate
   │     target-structure repetition · speech rate vs level
   │     → catches difficulty spikes, thin repetition, wrong pacing
   │
   ├─ 4. CONFIDENCE SCORE (composite, weighted)
   │
   └─ 5. HUMAN EXCEPTION REVIEW below threshold
```

### What percentage can bypass full human review?

**50–60% after ~20 videos of calibration, with a permanent floor of 1 in 5 fully reviewed regardless of score.**

The reason is structural, not a tuning problem. **Layers 1–3 validate text and phonemes. None validates prosody — and prosody is a large part of what a CI learner absorbs.** The round-trip ASR check is genuinely good at catching the synthesiser saying the wrong thing, but ASR is deliberately robust to prosodic variation, so audio a native speaker would reject sails through.

There is no automated proxy for "does this sound right to a native ear." Inventing a confidence score that implies otherwise would be exactly the fake-signal failure V4 was built on.

**This is the second independent argument for Korean:** the unvalidatable layer is prosody, and Korean is the target where prosodic error is cosmetic rather than semantic.

---

## Evidence still missing

| Gap | What's needed | Cost |
|---|---|---|
| **Test A — supply census.** Unrun. Most likely to kill the recommendation. | Google Cloud project + **YouTube Data API v3** enabled + API key. Free tier 10,000 units/day; `search.list`=100, `videos.list`=1. Six pairs × ~10 channels × 20 videos ≈ **3,000–4,000 units** = one day's free quota. No billing, no OAuth. | €0 |
| **Test B — actual bake-off.** I compared documentation, not audio. No published benchmark measures prosodic correctness, because no ordinary use case cares. | API keys for ElevenLabs v3, Google Chirp 3 HD, Azure. Same 60-second graded Korean script on each. **Native Korean rater** scores naturalness, A1/A2 speed suitability, and whether they'd learn from it. | ~€5 + €20–30 |
| **Blind synthetic-vs-human test.** Not run. | Three native speakers, generated audio vs human recordings. If they reliably flag the synthetic as unsuitable, the automation premise dies for every pair. | €60–90 |

**Naturalness and pedagogical correctness are different properties, and every benchmark measures the first.** No further desk research settles Test B — it needs a native ear on real generated audio.

---

## Decision

| | |
|---|---|
| **Winner** | **Korean ← English** — graded comprehensible-input Korean for English-speaking learners |
| **Confidence** | **Moderate, and lower than the previous two recommendations.** Demand and prosodic-risk findings are solid. Supply is unmeasured. TTS adequacy is documented but not heard. I have reversed this recommendation twice on new evidence — which should itself lower your confidence in the next version. |
| **Cost per video** | ≈ **€8–14** for 10 min graded video (TTS €3–6 at ~9,000 chars, LLM €1–2, thumbnail €1, compute ≈€0) **plus €10–18 QA amortised** at 50–60% bypass. **All-in ≈ €18–32.** |
| **Human minutes/video** | **Stage 1: 60–90 min.** Target by Stage 3: **25–35 min.** Stage 6's <45 min/asset is reachable; <20 is not, given the permanent review floor. |
| **Safe to build?** | **NO — not yet.** One measurement and one listening test stand between here and a build. |

### Kill conditions

1. **Supply census dense** — ≥8 Korean CI channels with median views >20% of subscriber count and regular cadence → the pair is served → Italian ← English.
2. **Native Korean raters reject the generated audio** for A1/A2 → pair dies → Italian next, European TTS is materially stronger.
3. **Blind synthetic-vs-human test fails across the board** → the language-learning thesis dies for every pair → **activate the Ambient fallback. Do not force this.**
4. **QA bypass calibrates below 30%** after 20 videos → human minutes never fall, the property never becomes autonomous, and it fails MioOS's purpose even if the channel works.
5. **Korean CI demand proves K-pop-adjacent rather than study-adjacent** — an audience that watches *about* Korean rather than *learns* Korean. Fandom niche, different monetisation.

---

## Next three actions, in order, before any code

1. **Create a Google Cloud project, enable YouTube Data API v3, hand over the key.** I run Test A the same session. Free, and the highest information per euro remaining.
2. **ElevenLabs + Google TTS credits (~€5).** Same graded Korean script on v3 and Chirp 3 HD.
3. **One native Korean speaker, one hour, ~€30.** Blind rating of both against a human recording.

**Total ≈ €35 and a few days** to close every remaining unknown. Against a €150 experiment ceiling, spending a quarter of it on falsification before writing code is the correct allocation.

---

*Method note: Test C is the strongest evidence here and it contradicted my own prior recommendation. Test B reversed an elimination made on a single stale source; the reversal rests on documentation that has been read, not heard. Test A did not run. The Korean prosody argument is a linguistic property, not a measurement, and is the most robust claim in this document. **Two reversals in two days is the process working — and also a reason to hold the third recommendation more loosely than the first.***
