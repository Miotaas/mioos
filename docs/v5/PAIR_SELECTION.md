# MioOS V5 — Language Pair Selection

3 Sep 2026. Falsification gate for the Experiment #1 niche hypothesis. **No code, no content generated.**
Full study: https://claude.ai/code/artifact/84ec8718-d599-42c1-b7b0-f53ab5430e35

Evidence tiers used throughout: **[MEASURED]** primary/named source · **[ESTIMATED]** derived or single weak source · **[JUDGEMENT]** my assessment, no data.

---

## RECOMMENDATION: graded English for Japanese-speaking learners

Two findings mid-research inverted the ranking I expected.

**1. The pair is two independent axes, not one unit.** The video is in the *target* language; the viewer is a learner whose native language is the *source*. So **source determines RPM, target determines competition.** Optimising the pair as a single thing produces a wrong answer.

**2. ElevenLabs is rated Poor for Korean, Japanese and Mandarin.** [MEASURED — single source] The highest-demand, thinnest-supply targets have the worst automated voice quality. In comprehensible input the voice is not cosmetic — it *is* the product; learners train their ear on it. This is close to disqualifying, not merely inconvenient.

---

## What this study cannot do

Channel supply per pair, views-to-subscriber ratios, and YouTube search volume per pair are **not reachable by web search**. They need YouTube Data API queries. Everything below is published demand data, spot inspection, or reasoning, tagged accordingly.

The Comprehensible Input Wiki — the one direct supply census that exists — lists **two languages**: American Sign Language and Toki Pona. [MEASURED] That's a signal about the space's immaturity, not a dataset.

**What would settle it:** for each finalist target, query the YouTube API for CI-matching channels and pull subscriber count, median views over the last 20 uploads, cadence, and channel age. The ratio that matters is **median views ÷ subscribers** — high ratios mean demand exceeds what the channel supplies, which is the signature of an underserved pair. Two-hour job, and the correct first task for MioOS's W1.

---

## Demand data [MEASURED — Duolingo 2025 Language Report]

- **Top 10 studied:** English · Spanish · French · Japanese · German · Korean · Italian · Chinese · Portuguese · Hindi
- **English is #1 in 154 countries, +14% YoY** — largest learner population on earth by a wide margin
- **Fastest growing:** Chinese (leads in 12 countries incl. DE, FR, ES, BR) · Korean (2nd in seven incl. FR, DE) · Portuguese (top in China, India)
- US/UK: Spanish #1 · US: Chinese 2nd-fastest-growing
- **Japan: learners lead globally in study commitment by time spent**, and top the polyglot ranking

That last point matters most: Japan combines a wealthy market, famously low English proficiency, an enormous private English-education spend, and the most committed learners in the world by time invested. Commitment is the variable that decides a long-form video format.

---

## The TTS constraint that reordered everything [MEASURED — single source]

| Provider | ES / FR / DE | KO / JA / ZH | English |
|---|---|---|---|
| ElevenLabs | **Exceptional** — native-matched prosody | **Poor** | Excellent |
| Google Cloud | Consistent | Very good · SSML/IPA phoneme control | Excellent |
| Azure | Good | Good, strong Mandarin · SSML control | Excellent |
| OpenAI | Limited pronunciation control | **Poor** | Competitive, no phonetic control |

Source: a 2026 developer comparison of five TTS APIs for language apps. Its ElevenLabs price ($0.30/1,000 chars) **conflicts with ElevenLabs' own page ($0.10/1,000)** — treat absolute prices as unverified; the quality ordering stands.

**Why near-disqualifying:** Japanese pitch accent and Mandarin tones are lexically contrastive — an error changes the word. A CI channel with mediocre target audio isn't slightly worse, it actively harms the learner, and learners detect it fast.

This eliminates Korean, Japanese and Mandarin **as targets** for a heavily automated pipeline — exactly where demand growth is. **The best opportunity and the best automation quality are in different places.** English-as-target is where they coincide.

---

## Top 10 considered

| # | Pair (target ← source) | Demand | Supply | Automation | Verdict |
|---|---|---|---|---|---|
| 1 | **English ← Japanese** | Highest | Crowded generally, thin for segment | Best available | **FINALIST** |
| 2 | **Italian ← English** | Top-7, wealthy | Moderate, podcast-led | Excellent | **FINALIST** |
| 3 | **English ← Korean** | Very high | Thin for segment | Best available | **FINALIST** |
| 4 | French ← English | Top-3 | InnerFrench, Français Authentique | Excellent | Top 5 |
| 5 | German ← English | Top-5 | Easy German dominant | Excellent | Top 5 |
| 6 | Portuguese (BR) ← English | Top-9, growing | Genuinely thin | Excellent | Cut — growth is China/India, low RPM |
| 7 | Korean ← English | High, fast growth | Several small channels | **TTS poor** | Cut on TTS |
| 8 | Japanese ← English | Top-4 | Thin true-CI | **TTS poor + pitch accent** | Cut on TTS |
| 9 | Mandarin ← English | Fastest-growing | Thin | **TTS poor + tones** | Cut on TTS |
| 10 | Spanish ← English | Highest | **Dreaming Spanish owns it** | Excellent | Cut on supply |

Demand column [MEASURED]. Automation column [MEASURED]. **Supply and audience-value columns are [JUDGEMENT]** — the supply census is exactly what could not be run.

---

## The three finalists

| | English ← Japanese | Italian ← English | English ← Korean |
|---|---|---|---|
| Learner population | Enormous | Moderate | Very large |
| Audience wealth / RPM | High (tier-1) | High (US/UK/DE) | High (tier-1) |
| Willingness to buy | **Exceptional** | Moderate | **Exceptional** |
| Target TTS | Best in existence | Excellent | Best in existence |
| Source-language surface | JA titles/thumbs/desc | **None** | KO titles/thumbs/desc |
| LLM competence | Highest | Very high | Highest |
| QA cost | **Lowest** — Mio pre-screens English | Native IT QA every script | **Lowest** |
| Competition | **Heaviest** | Moderate | Heavy |
| Affiliate depth | Deepest | Thinner | Deep |
| **Replication to #2** | **Change source market only — target production identical** | New target = start again | Same advantage |

### The replication argument (why English-target wins) [JUDGEMENT]

Property #1 English←Japanese, #2 English←Korean, #3 English←Turkish. **The expensive, quality-critical part — correct graded English audio and video — is byte-identical across all of them.** Only titles, thumbnails, descriptions and on-screen support change: a few hundred words per video.

Italian←English property #2 means a new target language, new voice model, new pedagogical grading, new native QA relationship. That isn't replication, it's starting again.

Stage 6's whole test is "can property #2 launch off the same pipeline in under 45 days." Source-segmentation is the only model where that's plausible.

---

## Native-speaker QA

### Must a native speaker be involved before publishing?

**Yes, for the first three videos without exception, then risk-based.** An error in a language-learning product installs a wrong pattern in the learner's production. They notice later and never come back. It's also the fastest route to the "this channel doesn't know what it's doing" verdict that kills a channel in its first ten videos.

| Task | Time | Rate | Per video |
|---|---|---|---:|
| Native English review of graded script — level, naturalness, register | ~30 min | €25–40/hr | €13–20 |
| Japanese support layer — titles, thumbnail text, description | ~10 min | €25–40/hr | €4–7 |
| Audio spot-check after render | ~5 min | — | €2–3 |
| **Full QA per video** | | | **€19–30** |
| **8 Stage-1 videos, full QA** | | | **€152–240** |
| **Risk-based: 3 full + 5 spot-check** | | | **€75–110** |

All [ESTIMATED].

**QA is the largest single line item, and at full coverage it breaks the €150 ceiling on its own.** That's the most consequential number in this study and it appeared in no previous version of the plan.

The risk-based model isn't a cost trick — it's only defensible because English-as-target lets Mio pre-screen the scripts himself, which no other pair allows. At €75–110 for QA, the remaining Stage-1 budget is €40–75: thin but survivable, since TTS and LLM are the only other real costs and assembly is free.

---

## Against the Ambient fallback [both ESTIMATED]

| | Language (EN←JA) | Ambient / sleep |
|---|---|---|
| **Time to first €100** | Month 5–8 (affiliate, pre-threshold) | **Month 3–5** — YPP reachable at ~1–2k views |
| **Time to first €1,000/mo** | Month 14–20 | **Month 9–15** |
| Binding constraint | Audience trust, pedagogical quality | 1,000 subscribers (watch-hours are trivial) |
| Workflows exercised | **All four** | W3 + W4 only |
| Moat | Pedagogical quality — thin but real | **None** |
| Policy exposure | Low | ~40% of pure AI-music channels demonetised |
| QA cost | €75–110 / 8 videos | ≈€0 |

Both timelines are built from format mechanics and published threshold rules, not observed channels. **The ordering is more reliable than the months:** ambient reaches money sooner by a margin large enough to survive being wrong about specifics.

**You are paying roughly four to six months of delay for a moat, a full-machine test, and lower policy risk. That's the trade — decide whether you want it.**

---

## Strongest argument against

**English is the most contested target language on the platform, and "underserved" is the weakest claim in this document.**

There are tens of thousands of English-learning channels. My wedge — that they teach *in the learner's language* or teach grammar, rather than delivering graded input *in* English — is a real distinction that learners may not care about, and it is unverified. The segmentation argument rests on my assumption that the Japanese-learner segment is thin, which is precisely the supply census I could not run.

Second: this recommendation optimises for **automation quality and replication**, both of which serve MioOS. It does *not* optimise for the emptiest or highest-growth opportunity — Korean and Japanese as targets score better there, and I cut them on a **single-sourced TTS rating**. If that rating is wrong or stale, my ranking is wrong.

## Evidence that would immediately kill this

1. **Supply census comes back dense.** Ten or more channels already delivering graded-English CI to Japanese learners with median views above 20% of subscriber count → the segment is served. Kill, move to Italian←English.
2. **A native Japanese speaker says the segment doesn't exist** — that Japanese learners of English just use English-language channels and don't seek Japanese-framed ones. Collapses the replication argument, since source-segmentation *is* the model.
3. **Blind audio test fails.** Play generated graded English to three native speakers alongside human-recorded equivalents. If they reliably flag the synthetic one as unsuitable for learners, **the automation premise is dead for every pair**, and ambient becomes the recommendation by default.
4. **The TTS rating is contradicted.** If ElevenLabs or a competitor demonstrably handles Japanese pitch accent well, Japanese←English returns as strongest: higher demand, thinner supply, wealthier audience.

**Tests 3 and 4 cost nothing and can be run this week, before anything is built.** Test 3 should be the gate before a single line of pipeline code — it's the cheapest possible falsification of the whole thesis and doesn't require the pair to be settled first.

---

*Next on approval: run tests 3 and 4, then the supply census. Content concepts only after that.*
