# Customer Validation Kit — Execution Package

6 Sep 2026. **Strategy frozen. Research closed.**
Formatted version: https://claude.ai/code/artifact/f8127c88-f68b-4986-bbbb-c732ae3b7999
Investment committee: `INVESTMENT_COMMITTEE.md`

**The next evidence in this project comes from a human being, not a search result.**

---

## RED TEAM: the method survives, the name does not

**"Value realization" is standard enterprise consulting vocabulary.** Every Big-4 firm has a benefits-realization practice. ERP vendors have sold it for thirty years. FinOps is the same discipline for cloud spend, with a foundation and certifications. MSPs do SLA reporting. It is neither new nor unclaimed. *[Likely]*

What is genuinely unoccupied is applying it at SME scale. But be careful **why**: possibly because SMEs don't buy assurance as a concept. A 30-person forwarder has no CFO, no transformation office, and nobody whose title contains "value."

**Baseline -> intervention -> measurement is how you work. It is not what you sell.**

### Two commercial consequences

1. **Don't price the monitoring — price the operating responsibility.** The monthly fee buys "it keeps working, and when it breaks someone who isn't you fixes it." The impact report justifies the renewal; it isn't the product. Sold as a reporting subscription it churns the moment novelty fades.
2. **The buyer is the owner-director or operations manager** — the person who does the work or watches it being done. Not a CFO (doesn't exist at this size). Not IT (outsourced to an MSP).

### Answers to the specific questions asked

| Question | Answer |
|---|---|
| Who already sells this? | Big-4 benefits realization, ERP value realization, FinOps, MSP SLA reporting. All enterprise-priced. |
| Underserved or rewording? | **Rewording at enterprise scale. Genuinely absent at SME scale** — but possibly because SMEs don't buy the category, only the relief. |
| What makes someone pay? | Not the concept. A specific workflow that visibly costs money and that they have already failed to fix themselves. |
| Who owns the problem? | Owner-director or operations manager. |
| Measurable before/after | Volume per period, minutes per instance, touch count, error/rework rate, cycle time, exception rate, cost per instance. All observable without instrumenting anything. |
| Smallest 30-60 day ROI | Recurring report assembly, or invoice intake. High frequency, low judgement, tolerable failure. |
| Recurring value after deployment | Operating responsibility — someone owns it when it breaks. The report is the renewal justification. |
| Eventual IP | The cross-client benchmark dataset (cost per unit across N comparable firms, measured identically) and the baseline measurement method. |

---

## A. Employment Gate

**Run before contacting anyone. It can end the discussion, which is why it goes first.**

| Document | Look for | Why |
|---|---|---|
| **Arbeidsovereenkomst** (signed contract) | **Nevenwerkzaamhedenbeding** (ancillary activities), **Concurrentiebeding** (non-compete), **Relatiebeding** (non-solicitation), **Geheimhoudingsbeding** (confidentiality), any IP / *uitvindingen* clause | The four clauses that decide whether this business is possible in its current shape |
| **Personeelshandboek / bedrijfsreglement** | Ancillary-work policy, conflict-of-interest policy, approval procedure for side activities | **Frequently stricter than the contract and routinely overlooked.** Often requires written permission rather than prohibiting outright. |
| **Applicable CAO** | Whether a collective agreement covers you and what it says about side activities | A CAO can override or supplement individual terms |
| **Signed addenda** | Clauses added at promotion, role change, bonus agreements | Restrictions are commonly introduced later, not at hire |

### How to read what you find

- **Nevenwerkzaamhedenbeding** — since August 2022 Dutch law requires the employer to objectively justify such a clause. Not automatically enforceable. But "not automatically enforceable" is not the same as "ignore it."
- **Relatiebeding** — the one most likely to bite. If it prohibits approaching relations of the employer and you sell to freight forwarders, you need to know exactly whose relations are covered.
- **Concurrentiebeding** — usually written for post-employment; check whether it reaches activity *during* employment.

### Three absolutes, regardless of what the contract says

- **No employer data, systems, documents or credentials — ever.**
- **No approach to any company you encounter through your job.**
- **No work on this during working hours or on employer equipment.**

If anything is ambiguous, one hour with an employment lawyer costs EUR 150-250. That exceeds the EUR 100 test budget and is worth it anyway. **I am not a lawyer and none of this is legal advice.**

**Gate:** clear or clarified in writing -> proceed. Permission needed -> decide whether to ask, knowing asking makes it real. Enforceable and covers this -> **the freight beachhead is dead, ICP shifts to profile 2 only**.

---

## B. ICP Hypothesis — two profiles, not three

| | **Profile 1 — primary** | **Profile 2 — fallback** |
|---|---|---|
| Who | Freight forwarder / 3PL / transport operator | Technical services — installers, machinery, maintenance |
| Size | 10-50 employees | 10-50 employees |
| **Buyer** | **Owner-director** or **operations manager** | **Owner-director** or **works planner** |
| Not the buyer | Not IT (outsourced), not a CFO (doesn't exist), not "head of innovation" (doesn't exist at this size) | same |
| Recognition signal | Quotes and bookings arrive by email in inconsistent formats and are re-keyed by hand | Quotes assembled from price lists and past jobs, by hand, per request |
| Why | **You can get a meeting.** That is the whole reason and it is sufficient. | Larger market, colder start. Becomes primary if the employment gate closes. |
| Disqualify if | Under 8 staff (no process), over 80 (procurement appears), has an internal developer (they'll build it), **any company you know through DSV** | same |

---

## C. Problem Interview — 20 minutes

**You are not selling. You are not mentioning AI.** If AI comes out of your mouth, the interview is contaminated and the data is worthless.

> **The one rule that makes this work: ask about the past, never about the future.**
> "Would you find that useful?" gets a polite yes and teaches you nothing.
> "When did that last go wrong, and what did you do?" gets the truth.

### 1 · Frame — 2 min

> "Thanks for the time. I'll be honest about why I'm here — I'm looking at starting something around operational admin in {sector}, and before I build anything I want to understand how it actually works in firms your size. I'm not selling anything today. I'd mostly like to listen. Is 20 minutes still OK?"

*Naming that you have no product removes their defence. It is also true, which makes it easy to say.*

### 2 · Map the week — 4 min

> "Walk me through a normal week here. What does the office side actually spend its time on?"
>
> "If you had to name the one task that eats the most hours and produces the least value — what is it?"
>
> "And who does it? One person, or does it move around?"

*You want the task they name unprompted. Write down their exact words — that phrasing becomes your outreach language.*

### 3 · Drill into one process — 8 min, the core

> "Take me through the last time you did {that thing}. Not how it's supposed to work — what actually happened."
>
> "How does it arrive? Email, phone, portal?"
>
> "Then what — which systems do you open?"
>
> "How long did that one take, start to finish?"
>
> "How many of those come in — per day, per week?"
>
> **"What makes one take twice as long as another?"**

*That last question is the most valuable in the script. It surfaces the exception path — the 20% of edge cases that kill 70-85% of implementations. If they can't answer it, the process isn't understood well enough to automate and you should walk away.*

### 4 · Evidence of real pain — 4 min

> "When did that last go wrong? What happened?"
>
> "What did that cost you — did it lose a job, or just time?"
>
> **"Have you tried to fix this before? What did you try?"**
>
> "Did you pay for anything? What happened to it?"
>
> "Who else here complains about this?"

*"Have you tried to fix it" is the qualifier. **People who have never attempted a fix have an annoyance, not a problem.** People who tried and failed are your customers. People who paid and it failed are your best customers.*

### 5 · The number test — 1 min

> "Rough guess — what do you think that whole process costs you in a month? Hours or euros, whichever comes easier."

***This is the wedge test.*** *If they answer confidently and precisely, they already measure and the diagnostic has no value to them. If they hesitate, guess wildly, or say "no idea, a lot" — that's the gap, confirmed in their own voice.*

### 6 · Close — 1 min

> "That's really useful, thank you. Two things — is there anyone else in {sector} you think I should talk to? And would you mind if I came back to you once I understand this better?"

*Referral plus permission to return. The permission is what lets you pitch later without it being a cold approach.*

### Do not, under any circumstances

Mention AI, automation, software or MioOS. Describe what you might build. Ask "would you pay for...". Pitch the diagnostic in this call.

**If they ask what you'd build: "I don't know yet, that's why I'm asking."** True, and it protects the data.

---

## D. Outreach — three messages

All ask for insight, not a meeting about a product. None mentions AI.

### 1 · LinkedIn connection note (~300 chars)

```
Hi {name} — I work in air freight operations and I'm researching how
forwarders your size handle quoting and booking admin. Not selling
anything. Would you be open to a 20-minute call to tell me how it
actually works at {company}?
```

### 2 · Email — cold but specific

```
Subject: 20 minutes on how you handle quote requests?

Hi {name},

I work in air freight operations and I'm doing some research into how
forwarders of 10-50 people handle the admin side — quoting, booking
intake, that kind of thing.

I'm not selling anything and I don't have a product. I'm trying to
understand what actually takes time in firms your size, from people who
do it rather than from articles.

Would you have 20 minutes in the next couple of weeks? Happy to work
around your schedule, and I'll send you what I learn across all the
conversations.

Best,
Mio
```

*On the last line: offering the aggregate findings is the only thing you have to trade, it costs nothing, and it's the closest thing to a reason for a stranger to say yes.*

### 3 · WhatsApp / warm intro

```
Hey {name} — {referrer} mentioned you run operations at {company}.

I'm looking into how forwarders handle quoting and booking admin before
I decide whether to build something in that space. No pitch, genuinely
just trying to learn how it works in practice.

Any chance of 20 minutes sometime? Even a coffee if you're near {city}.
```

### Volume expectation

Cold email to SME owners converts poorly — assume **5-15% reply, 3-8% agree to talk** *[ESTIMATED]*. Ten interviews needs roughly **120-200 cold contacts, or ~25 warm ones**. **Spend your effort on warm.** Every referral from question 6 is worth twenty cold emails.

**NL law:** B2B email to business addresses is generally permitted, but include a way to opt out and stop immediately if asked. Individually written, low volume, never bulk-sent.

---

## E. Qualification Scorecard

Fill one per discovered workflow, straight after the call.

| Dimension | Weight | 1 = poor | 5 = excellent |
|---|:--:|---|---|
| Frequency | x2 | Monthly or less | Many times daily |
| Labour per instance | x2 | Under 5 min | Over 30 min |
| Error / rework cost | x1 | Errors harmless | Errors cost money or customers |
| Delay cost | x1 | Nobody waits | Slow response loses the job |
| Revenue impact | x1 | Pure back-office | Directly touches winning work |
| **Feasibility solo** | **x3** | Deep ERP integration, realtime, regulated | Email in, document out, tolerant of 2-hour delay |
| **Measurability** | **x3** | Cannot count units before/after | Volume, minutes, errors all countable today |
| **Buyer urgency** | **x3** | "Someday" | **Already tried to fix it and failed** |

**Max 80.** 55+ -> pitch the diagnostic. 40-54 -> keep warm, revisit after a case study. Under 40 -> thank them, move on.

**Feasibility, measurability and urgency carry triple weight deliberately.** A painful, frequent, expensive workflow you can't deliver solo, can't measure, or that nobody urgently wants fixed is *a worse opportunity than a smaller one scoring well on all three.* The scorecard exists to stop you taking the exciting project that kills you.

---

## F. First Paid Offer

Pitched only after an interview scores 55+. **Never in the interview itself.**

| | |
|---|---|
| **Name** | **{Workflow} Cost Baseline** — named after their process, in their words. Never "AI diagnostic," never "impact assurance." |
| **Price** | **EUR 750** for customer #1-2, **EUR 1,250** thereafter. Half up front. |
| **Duration** | Two weeks, ~8-10 hours of evenings |
| **The pitch** | "You said you don't know what quoting costs you. For EUR 750 I'll find out — properly, with real numbers from your own process. Two weeks. You keep the analysis whether or not we do anything after." |
| **Deliverable** | 6-8 pages: volume per month, minutes per instance from 20+ timed real observations, fully-loaded cost per instance and per year, exception rate and its causes, the specific automatable steps with an estimated post-change number, what it would take, **and what it would not fix** |
| **You need** | A sample of real requests, 20 timed observations, one hour with the person who does the work, their rough loaded hourly cost. **Nothing leaves their systems.** |
| **Why EUR 750 is fair** | Only 19% of Dutch organisations track any operational AI metric. It's a decision instrument they don't have and can use with or without you. |
| **Honest failure mode** | The number comes back small. Say so and do not sell an implementation. **You disqualified a bad project for EUR 750 instead of failing a EUR 6,000 one** — and that client refers you, because almost nobody tells them not to buy. |
| **What follows** | Annual number above ~EUR 15,000 -> an implementation is easy to justify. Below -> there is no honest implementation to sell. |

**Free for customer #1 in exchange for a written case study and a reference call — decide that now, before you're sitting in front of them.** Deciding in the room is how you give away the second and third too.

---

## G. Validation Thresholds

Written before the data exists. Same discipline that killed Korean.

| Stage | GO | ITERATE | KILL |
|---|---|---|---|
| **1 · Employment gate** | Clear, or clear in writing | Permission needed -> decide whether to ask | Enforceable and covers this -> **profile 2 only** |
| **2 · Access** (can you get meetings) | 10+ interviews in 4 weeks | 5-9 -> change channel, go warmer | **Under 5 in 6 weeks** -> you cannot reach this buyer; nothing downstream matters |
| **3 · Problem** (is pain real) | 6+ of 10 name an unprompted painful workflow **and** 4+ tried and failed to fix it | Pain real but scattered across workflows -> narrow the ICP | Under 4 of 10 describe real pain |
| **4 · The wedge** (does the measurement gap exist) | 7+ of 10 cannot state what the process costs | 5-6 -> gap thinner; lead with the workflow instead | **4+ of 10 already know their number** -> the wedge does not exist and the differentiation collapses |
| **5 · Money** (will anyone pay) | **1+ of 5 qualified prospects transfers a deposit within 8 weeks** | Verbal yes, no payment -> price or offer is wrong, not the business | **0 of 5 pay within 10 weeks** |

### The rule that makes these real

**"They were very interested" is not a GO.** Enthusiasm is free and universally offered to anyone not selling. The only stage-5 signal that counts is **money moving** — not a signed intent, not a scheduled follow-up, not an introduction to their bookkeeper. A bank transfer.

**Anti-sunk-cost rule carries over unchanged:** a stage missing its threshold at its time box gets ITERATE or KILL, never an extension.

### If stage 5 kills

It does **not** mean returning to niche research. The interview notes will say which of three things it means: the ICP is wrong (test profile 2), the price is wrong (test EUR 350 and EUR 1,500 — a too-low price signals a worthless deliverable), or the diagnostic is the wrong first purchase and you should sell the smallest implementation directly. **All three are cheap tests. None is a new business.**

---

## H. What becomes software — later, not now

| Asset | Valuable when | Trigger |
|---|---|---|
| **The benchmark dataset** — cost per quote/invoice/order across N comparable firms, measured identically | You can tell client #12 they sit at the 80th percentile. Nobody else can say this. | **Customer #5** |
| Baseline templates + interview protocol | Delivery hours for diagnostic #3 fall below 60% of #1 | Customer #3 |
| Reusable connectors | The same integration appears a third time | Customer #3 |
| Monitoring + monthly impact reporting | **3-5 clients need substantially the same measurement layer** | Customer #4 |
| The Impact Control Plane as a product | Six customers, hours ratio still falling, clients ask for the report between deliveries | Customer #6+ |

**Customers 1-3 run on a spreadsheet, a folder and a calendar.** If software gets built before then, it will be the fifth cockpit for a business that hasn't sold anything.

---

## Sequence

1. **Employment gate — this week.** Only step that can end the discussion.
2. **Outreach — next week.** Warm first.
3. **Ten interviews over four weeks.**
4. **Score them.**
5. **Pitch the diagnostic to anything above 55.**

Everything else waits.

---

*Strategy frozen. Research closed. Media experiment archived in `../v5/`, not deleted. AION untouched. Nothing built, nothing provisioned, EUR 0 spent to date. Not legal advice. Conversion rates and effort estimates are estimates; the 19%-measurement and 95%-no-P&L-impact figures are measured and sourced in the investment committee.*
