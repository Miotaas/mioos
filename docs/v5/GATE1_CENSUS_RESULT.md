# MioOS V5 — Gate 1: YouTube Supply Census Result

Run 5 Sep 2026. 262 channels, 2,930 quota units, 7 query clusters.
Raw data: `census/census-output.json` · Instrument: `census/census.mjs` (disposable)
Full document: https://claude.ai/code/artifact/4ac02257-4d86-414b-99e1-50de9b229ed7

# VERDICT: KILL — Korean ← English

**Twenty-two Korean comprehensible-input channels were created in the last ninety days.** Twelve are publishing ≥8 videos in that window. Their median subscriber count is **9**. Their median views per video is **73**. Two of the twenty-two have passed 1,000 subscribers.

Twenty-six channels have *slow* in the name — fourteen under a year old. The strategy I recommended is being executed by roughly **one new channel every four days**, and almost none are getting anywhere.

First measurement in the project rather than an inference. Kill condition fires as written; not reinterpreted after the fact.

---

## 1. Measured findings

| Measure | Value | Note |
|---|---:|---|
| Distinct channels surfaced | 262 | 7 clusters, channel + video search |
| With usable subs + median views | 252 | 10 hide subs or uploads |
| In CI-intent clusters | 205 | Excludes broad + TOPIK controls |
| **Korean-relevant CI channels** | **160** | After filtering query bleed |
| Median subscribers (whole set) | 2,390 | p25 = 32 · p75 = 65,300 |
| Median views ÷ subs (whole set) | 0.302 | p75 = 1.90 · p90 = 17.53 |

### Age distribution of the 160 Korean CI channels

| Cohort | Channels |
|---|---:|
| **Under 1 year** | **55** |
| 1–2 years | 27 |
| 2–4 years | 35 |
| 4+ years | 43 |

**Of the 55 under one year, 22 are under ninety days.** A healthy mature niche does not add a third of its channel population in twelve months. That shape is an entry rush, and entry rushes precede saturation rather than opportunity.

### Per-cluster surfacing

| Cluster | Channels | Reading |
|---|---:|---|
| `ci_slow` | 76 | Largest. "Slow Korean" is the established vernacular, not "comprehensible input" |
| `ci_story` | 61 | Heavy bleed into K-content and general storytelling |
| `immersion` | 59 | Bleeds into Japanese immersion (Matt vs Japan, JapanesePod101) |
| `adjacent_topik` | 44 | Exam prep, conventional teaching — adjacent not competitive |
| `ci_descriptive` | 36 | Cleanest signal for real listening-practice channels |
| `control_broad` | 35 | Control fired as expected — the big teaching brands |
| `ci_explicit` | 33 | **The truest set. Zero false positives.** |

This answers the caveat raised before the run: thin supply is **not** a query-matching artefact. `ci_explicit` returned 33 channels with no bleed at all, `ci_slow` returned 76. The vocabulary matched. Supply is real and dense.

---

## 2. Direct competitors

**DIRECT — genuine graded/comprehensible Korean input, active:**

| Channel | Subs | Median views | v/s | Age | 90d | Read |
|---|---:|---:|---:|---:|---:|---|
| **Daily Korean with Jaerim** | 106,000 | 53,241 | 0.50 | 290d | 6 | **The proof demand exists.** Under a year, all long-form, "Slow Korean + Real-Life Conversations" |
| Sami 세미 | 96,600 | 45,885 | 0.48 | 1,073d | 20 | High output, high engagement |
| Pronounce Korean | 191,000 | 12,323 | 0.06 | 1,186d | 10 | Mixed shorts/long, conversational |
| 몰입한국어 Immersion in Korean | 171,000 | 4,009 | 0.02 | 1,202d | 11 | Explicit A0–A1 graded stories. Closest to the exact proposed format. |
| Delicious Korean | 122,000 | 4,140 | 0.03 | 646d | 20 | "Learn Korean Like a Baby" — CI framing, daily cadence |
| Storytime in Korean | 74,300 | 15,783 | 0.21 | 1,278d | 0 | Dormant, beginner podcast |
| Ria Korea 리아 코리아 | 64,800 | 10,667 | 0.16 | 751d | 15 | 1-hour slow Korean podcasts |
| Korean with Mina | 39,000 | 3,019 | 0.08 | 422d | 17 | Beginner podcast |
| Korean with Sol | 36,800 | 5,820 | 0.16 | 1,160d | 8 | Explicitly labels B1–B2 CI |
| 토토의 Korean Podcast | 27,800 | 4,686 | 0.17 | 4,982d | 0 | Dormant |
| All Things Korean Podcast | 17,600 | 3,617 | 0.21 | 884d | 7 | Native-level podcast |
| Korean Daily by Summer | 9,940 | 2,654 | 0.27 | 285d | 20 | Under a year, daily output |
| Hayden Kim | 9,880 | 2,598 | 0.26 | 416d | 20 | Under 18 months, daily output |

Plus a long tail: 태웅쌤 (44k, explicitly "Comprehensible Input Korean"), Comprehensible Korean (5.6k), Learn Korean with Goos, Korean Cheat Code, Breeze Korean, Dive Korean, KIWI, Yuno Korean, Somi Korean, Korean With Yum.

**Thirteen substantial direct competitors, roughly thirty more below them.**

**ADJACENT** (conventional teaching, own the search terms): Talk To Me In Korean (2.14M), KoreanClass101 (1.65M), GO! Billy Korean (820k), Korean with Ina (712k), Prof. Yoon's.

**IRRELEVANT** (query bleed, excluded): 1theK, Little Remy Food, Kristel Fulgar, BBC Learning English, JapanesePod101, WildBrain, Rosetta Stone.

---

## 3. Strongest demand signals

- **Daily Korean with Jaerim: 106,000 subs in 290 days, median 53,241 views, v/s 0.50, all long-form.** Proves the format works, the audience exists, and a new entrant can reach six figures inside a year. Best evidence for the niche in the dataset.
- **Sami 세미: v/s 0.475 at 96,600 subs with 20 uploads/90d.** Sustained engagement at scale, not a spike.
- **Two channels under a year old already above 9,900 subs with daily cadence.** Entry is not closed to newcomers.
- **Vocabulary is established** — 76 channels on "slow Korean" terms, searched in both English and Korean (천천히 한국어).
- Field-wide median views ÷ subs of 0.30. Audiences watch more than they subscribe.

**Demand is genuine. That is not the problem.**

---

## 4. Strongest evidence against

### The entry wave — the finding

Twenty-two Korean CI channels created in the last **ninety days**. Ages in the data: 0, 2, 4, 6, 9, 14, 16, 24, 25, 34, 38, 41, 41, 51, 51, 60, 70, 70, 70, 76, 83, 89 days. Names include *slow korean jay*, *Slow Korean with Woon*, *Korean slowly*, *Slow Korean Mood*, *Slow Korean Listening*, *Easy Slow Korean Conversation*, *Korean Listening Lessons*, *Claire-ly Korean*, *Haewa Korean*, *SPEAK KOREAN 300*.

**Twelve of the twenty-two publish ≥8 videos per 90 days. Median subscriber count: 9. Median views: 73.** One has 20 uploads and a median of 1 view. Two of twenty-two have crossed 1,000 subs.

This is what a market looks like while it saturates: heavy new supply, near-zero marginal return. Whatever made this niche attractive is visible to everyone else, and they arrived first — by months, not years.

### Kill condition, applied as written

From `PAIR_DECISION.md`: *"If ≥8 Korean CI channels show median views above 20% of subscriber count with regular cadence, the pair is served."*

| Subscriber floor | Channels meeting v/s > 0.20 AND ≥4 uploads/90d | Condition |
|---|---:|---|
| **None — as written** | **41** | **MET** |
| ≥ 1,000 | 9 | **MET** |
| ≥ 5,000 | 5 | not met |
| ≥ 10,000 | 3 | not met |

**The condition was written with no subscriber floor. As written it is met at 41 channels, and still met at a 1,000-sub floor.** It only fails if a 5,000-sub floor is invented after seeing the result — the exact move ruled out in advance. The condition fires.

The floor question is real and should be stated: below ~1,000 subs the ratio breaks — a channel with 2 subs and 427 median views scores 213, which measures an unsubscribed search audience, not demand pressure. That is a genuine defect in the metric chosen. **It does not rescue the recommendation**, because the entry-wave evidence is independent of the ratio entirely — it rests on creation dates, upload counts and raw view counts.

---

## 5. Supply-constrained or demand-constrained?

**Neither. Supply-flooded.**

Demand is real and growing — Jaerim's 53,000 median views on a 290-day-old channel settles that. But supply is expanding faster than demand, and the marginal entrant captures essentially nothing: median 9 subs and 73 views across 22 channels that have collectively published hundreds of videos in three months.

The distinction matters. A supply-constrained niche rewards more content. A demand-constrained niche rewards nothing. **A supply-flooded niche rewards only differentiation we do not currently have** — and the differentiation argument was pedagogical quality delivered through automation, which is exactly what the 22 new entrants are attempting, with the same tools, at the same time.

**This is the "automation is not a moat" premise confirmed empirically rather than argued.** The niche-selection document opened by claiming automation is a commodity because everyone has the same LLM, TTS and FFmpeg. The census caught that happening in one niche, in real time, with dates attached.

---

## 6. Confidence and limitations

**Confidence in the KILL: high** — higher than any prior recommendation in this project, because it is measurement rather than inference. The entry-wave finding does not depend on classification judgement, on the ratio metric, or on the search-ranking bias flagged in advance.

**Limitations:**

- **Search bias cuts the other way here.** `search.list` over-surfaces successful channels, biasing supply estimates upward — that would have made a GO harder to justify, not a KILL. It cannot manufacture 22 near-dead new channels; if anything the true entry wave is *larger* than measured, since failing channels are what search suppresses.
- **The v/s metric is unreliable below ~1,000 subs.** Acknowledged defect, immaterial to the verdict.
- **Classification is judgement** — CI vs conventional read from titles and format, not from watching. The `ci_explicit` cluster required no judgement and alone returned 33 channels.
- **One point in time.** A 90-day entry wave could be a spike rather than a trend. Re-running in 60 days would distinguish them — not a reason to build in the meantime.

---

## 7. Verdict

| | |
|---|---|
| **Korean ← English** | **KILL.** Kill condition met as written. Entry wave independently disqualifying. |
| **Gate 2 (TTS bake-off)** | **Do not run.** Do not spend the €5–10 — it would test a dead pair. |
| **Gate 3 (native QA)** | Do not run. |
| **Spent this gate** | €0. Total spent on MioOS V5 to date: **€0**. |

### Recommended next step — and it is not a rerank

The instruction was to rerank remaining pairs rather than restart research. Pushing back on half of that:

**Reranking Italian and Japanese on judgement would repeat the exact error this census corrected.** Everything believed about Korean supply before the run was wrong in a way no amount of reasoning would have caught. The tool now exists, the API key works, the script runs in a minute, and one more run costs **€0 and ~3,000 of the 10,000 daily quota units.**

Change two lines in `CLUSTERS` and run it again for **Italian ← English** and **Japanese ← English**. If either returns without the entry-wave signature, that is a measured candidate rather than a guessed one.

### Hold this open

The tooling that made Korean CI cheap is language-agnostic. **If Italian and Japanese show the same 90-day entry wave, the finding is not "wrong pair" — it is that the CI-video format is commoditising across all languages simultaneously**, and the language-learning thesis dies entirely rather than pair by pair.

In that case the pre-agreed answer applies: **activate the Ambient fallback rather than forcing this.** Better to learn that from two more free API runs than after eight videos and €150.

---

*Provenance: all figures computed from `census-output.json` (YouTube Data API v3, 5 Sep 2026). Subscriber counts, creation dates, upload counts and view counts as returned by the API. Median views over the last 20 uploads per channel where available. Relevance filtering and CI-vs-conventional classification are judgement on titles and format; the `ci_explicit` cluster required no filtering.*
