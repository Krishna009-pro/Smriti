# Smriti — Winning Strategy for ET AI Hackathon 2026
### (working title in your draft: "PlantBrain")
**Phase 1 — Final Product Definition**

---

## 0. Read this first: what I changed, and why

You asked me not to treat your draft as perfect. Here's the honest CTO/CPO read, before we get into the deliverable:

**What's genuinely strong and I kept:**
- The core insight — incumbents (Maximo, SAP PM, etc.) store *documents*, not *judgment*. Tribal knowledge is the real unexploited asset. This is a sharp, defensible thesis.
- FastMCP + a lightweight graph as the technical spine. This is current, real, and demonstrates technical taste — MCP is genuinely one of the more interesting protocols in the ecosystem right now, and almost nobody at a student hackathon will have built a *native* MCP tool mesh instead of a bolt-on chatbot.
- The five-minute demo script structure (hook → magic → proactive moment → learning loop → executive view) is professionally paced. I kept its bones.

**What I challenged and changed:**
1. **The statistics.** I fact-checked the quantitative claims in your draft against live sources. Some are solid; some are not attributable to any real study I could find, and one is likely conflated from an unrelated domain. Using an unverifiable "NASSCOM-EY study" figure on stage in front of industry-leader judges is a real risk — if even one juror asks "can you send me that report," and you can't, your credibility on *everything else* takes the hit. I've replaced the shaky numbers with verified ones and flagged the rest. See Section 3.
2. **Scope.** Your draft's five features are the *right five categories*, but as specified (native mobile push notifications, a working federated cross-plant network effect, full Qwen2.5-VL self-hosted P&ID parsing) they are not buildable to a convincing demo standard in a hackathon build window. I've kept the five categories but re-scoped each one down to what a small team can actually ship and demo without it breaking on stage. Every cut is explained, not just made.
3. **The "moat" argument.** SQLite-over-Neo4j is a smart *engineering* decision for a hackathon (zero infra, instant setup, single file you can literally hand a judge on a USB stick). It is not, by itself, a *business* moat — any funded competitor can swap in Neo4j in a week. I've reframed your defensibility argument around what's actually hard to copy: the decision-symptom-fix extraction schema and the accumulating dataset of technician-verified fixes. That distinction matters when a VC-minded judge probes you.
4. **The competition format.** I checked what the ET AI Hackathon 2026 (2nd edition, run with Unstop) actually is. It's not a single overnight 48-hour hack — it's a multi-phase program: an assessment round, ideation, prototyping, MVP-building, and a national finale where you pitch to industry leaders and founders, with a ₹10L prize pool (₹5L winner / ₹3L / ₹2L) and judging on **Relevance, Technical Implementation, Business Viability, Innovation, and Presentation**. Registration closed mid-May 2026, so by now you're most likely inside the prototyping/MVP-building phase heading toward the finale. I've kept your "48-hour MVP sprint" framing exactly as you asked — it's still the right *internal* forcing function for the build — but calibrated the roadmap and judging alignment to the real 5-criteria rubric rather than a generic hackathon checklist.

Everything below is built on that corrected foundation.

---

## 1. Final Product Name

I generated and ranked 10 candidates against four filters: **memorability**, **explainability in one sentence**, **trademark/collision risk**, and **resonance with an Indian industry-leader jury**.

| Rank | Name | Why it works | Why it might not |
|---|---|---|---|
| **1** | **Smriti** (स्मृति) | Sanskrit/Hindi word that literally means *memory* — and in Indian tradition, *smriti* texts are specifically the body of remembered, transmitted knowledge passed down through generations, as opposed to *shruti* (directly revealed/written scripture). That's an almost eerily precise metaphor for "tribal knowledge that lives in people's heads, now captured and transmitted." It's short, pronounceable, unclaimed in industrial software, and it hands the judges an instant emotional hook without you having to explain it twice. | Needs one clarifying line for non-Hindi-speaking jurors on a national panel; pair with an English subtitle. |
| 2 | PlantBrain | Your original. Instantly literal — nobody needs it explained. Safe, functional, demo-friendly. | Sounds a little like a consumer app or a toy; doesn't signal the "memory," "tribal knowledge," or "compounding" angles that are your actual differentiators. Generic enough that it could describe five other CMMS products. |
| 3 | Anubhav OS | *Anubhav* (अनुभव) = "lived experience." Directly names the exact asset you're capturing (experiential, not documented, knowledge). | Slightly less crisp as a one-word brand than Smriti; "OS" suffix is doing a lot of work. |
| 4 | Sutradhar | The thread-holder / narrator-orchestrator of classical Indian theatre — literally "one who holds the string that connects everything." Strong metaphor for a system that ties together P&IDs, shift notes, and telemetry. | Harder to pronounce for a non-Indian audience; risks sounding more like an orchestration/workflow tool than a memory system. |
| 5 | TribalOS | Directly recycles the "tribal knowledge" term already anchoring your research. Judges who've read any maintenance literature will recognize it instantly. | "Tribal" carries unrelated cultural connotations outside this specific industry-jargon usage and can read oddly out of context in a written PRD or on a slide — avoid for a public-facing brand. |
| 6 | MemoryMesh | Literal, technical, plays well with "graph/mesh" architecture language. | Sounds like infrastructure tooling, not a product a plant manager would recognize. |
| 7 | Continuum | Signals the self-learning, never-static positioning well. | Overused across SaaS/AI branding; no industrial specificity; weak trademark distinctiveness. |
| 8 | IndusMind | "Indus" nods to Indian industry; "Mind" nods to cognition. | Falls into the generic "-Mind" AI-startup naming cliché; less distinctive than it sounds on first read. |
| 9 | Praxis OS | Greek for "practice/knowledge-in-action" — decent conceptual fit. | Already used by multiple existing software products; weak differentiation, no India-market resonance. |
| 10 | Vidura | Named for the Mahabharata's wise counselor, famed for seeing what others missed and advising at the moment of crisis. Great story hook if you want to lean hard into the narrative. | Too specific/mythological a reference for a 5-minute technical pitch — risks reading as gimmicky rather than sophisticated, and means nothing at all outside India. |

### Recommendation
**Smriti** — positioned on every slide as *"Smriti — the Industrial Memory OS."* It's the only name on this list that is simultaneously ownable, one word, emotionally resonant with an Indian jury, and a near-perfect literal description of what the product does. Keep "PlantBrain" alive only as a one-time explanatory aside in your opening ("we call it Smriti — Sanskrit for memory — because that's exactly what it is") rather than as the primary brand.

---

## 2. One-Line Pitch

20 candidates, then the strongest.

1. Smriti is the memory layer every factory is missing — turning tribal knowledge into a queryable, self-learning graph before it walks out the door.
2. The world's first Industrial Memory OS: it doesn't just store your plant's documents, it remembers what your best engineers know.
3. When your most experienced engineer retires, Smriti makes sure the plant doesn't forget what they knew.
4. Smriti turns decades of tribal knowledge into a queryable asset — before it walks out the door for good.
5. Not another chatbot for your P&IDs — Smriti is the memory graph that learns from every shift, every fix, every technician.
6. Smriti watches your plant's telemetry, remembers your engineers' judgment, and warns you before the line goes down.
7. P&IDs tell you how the plant was built. Shift notes tell you how it actually runs. Smriti is the first system that reads both.
8. A self-learning memory graph that turns tribal knowledge into an asset that compounds instead of retiring.
9. Smriti gives a junior technician the instincts of your most senior engineer — on day one.
10. Built on FastMCP and a lightweight graph engine, Smriti brings enterprise-grade industrial memory to any plant, without an enterprise-grade budget.
11. Your ERP remembers assets. Your EAM remembers work orders. Nothing remembers *why* the senior engineer checks the valve first. Smriti does.
12. Smriti: an Industrial Memory OS that gets smarter every time a technician corrects it.
13. We're not building a search bar for your documents. We're building a memory that outlives a career.
14. Smriti closes India's industrial knowledge cliff, one shift note at a time.
15. The factory that never forgets: Smriti fuses P&IDs, shift logs, and technician judgment into one living graph.
16. Smriti proactively warns operators before failure, using the same tribal knowledge your veterans carry in their heads.
17. From static documents to living memory: Smriti is the operating system for everything a plant has ever learned.
18. Smriti exists because the most valuable knowledge in your plant was never written down — until now.
19. An MCP-native memory graph that plugs your plant's tribal knowledge directly into Claude, or any AI client, in minutes.
20. Smriti doesn't wait for a query. It watches your telemetry, remembers your failures, and speaks up before the next one happens.

### Strongest
**"Smriti is the Industrial Memory OS that makes sure a factory never forgets what its best engineers know — even after they retire."**
It does three jobs at once in one breath: names the category (Industrial Memory OS), states the mechanism (captures expert knowledge), and lands the emotional stake (retirement/knowledge loss) that your demo script's opening story is built around. It's also the only version of the pitch that a plant manager, a VC, and a hackathon judge would all restate the same way after hearing it once — that's the actual bar for a good one-liner.

---

## 3. Problem Statement

### The real industrial problem
Heavy industry doesn't have a documents problem. It has a **judgment problem**. The physical structure of a plant — pipes, valves, sensors — is well documented in P&IDs and EAM systems. What's missing is the *decision layer*: why an experienced operator does X instead of Y under specific conditions. That knowledge is real, valuable, and almost entirely undocumented — it lives in shift-handover notes, verbal handoffs, and the heads of people approaching retirement. When they leave, the plant doesn't just lose a person; it loses a decision tree nobody wrote down.

### Why current solutions fail
Systems of record like IBM Maximo or SAP PM are excellent at what they're built for: tracking assets, scheduling work orders, and maintaining compliance trails. They were never designed to capture *why* — they treat the free-text field on a work order as a comment, not as data. A standard RAG chatbot layered on top of these systems doesn't fix this either: it can retrieve the official manual, but it has no way to know that the manual is wrong for the monsoon-season edge case the senior technician has quietly worked around for a decade. The system either hallucinates a plausible-sounding but incorrect answer, or it fails to answer at all. That gap — between what's written and what's known — is the opening.

### Quantified impact — verified

I checked the numbers in your draft against live sources rather than assuming they were right. Here's what holds up and what I'd change before you put it in front of judges:

**Keep — these are real, sourced, and citable on stage:**
- Unplanned downtime costs the world's 500 largest companies (Fortune Global 500) an estimated **$1.4 trillion a year — 11% of their combined revenue**, up from $864B (8% of revenue) in 2019–20. *(Source: Siemens, "True Cost of Downtime," 2024.)*
- In automotive manufacturing specifically, a halted line costs roughly **$2.3 million per hour — about $639 per second.** *(Same Siemens report — your original number here was correct.)*
- Knowledge workers spend roughly **20% of the workweek** — about one full working day — searching for and gathering information rather than using it. Some studies push this as high as 25%. *(McKinsey Global Institute; corroborated by Atlassian.)*

**Drop or reframe — I could not verify these, and I'd recommend you don't either:**
- Your draft's **"35% of working hours"** figure and the **"NASSCOM-EY study" citing 7–12 disconnected systems per plant** — I searched specifically for this study and could not locate it. It's possible it exists in a paywalled report, but you should not cite a specific study by name unless you can produce it if asked. Reframe as a qualitative, defensible claim instead: *"It's common, though rarely formally quantified, for a large Indian plant to run operations across a half-dozen or more disconnected systems — engineering vaults, legacy EAM software, spreadsheets, and email."* That's true, useful, and un-fact-checkable-in-a-bad-way.
- The **"18–22% of unplanned downtime is attributable to knowledge fragmentation"** and **"MTTR stretched from 49 to 81 minutes"** figures — I could not attribute either to a specific study, and the MTTR figure in particular reads like it may be conflated from IT-incident-response benchmarks rather than industrial maintenance data. Cut both, or relabel explicitly as *"an internal estimate for the purposes of this pitch"* if you want to keep the shape of the argument.
- The **"25% of India's most experienced engineers retiring within a decade"** stat — again, unverified. The underlying trend (an aging skilled-manufacturing workforce and a widening experience gap as veterans retire) is real and well documented directionally in India and globally, but attach it to the *general trend*, not to a specific unverifiable percentage.

This isn't pedantry — it's risk management. Your strongest, truest number ($1.4T, Siemens-sourced) does all the work you need it to do. Padding it with soft numbers only gives a skeptical judge an easy way to poke a hole in an otherwise excellent pitch.

---

## 4. Target Users

| Persona | Core need from Smriti |
|---|---|
| **Field Technician** | Fast answer to "what's actually wrong and what's actually worked before," without digging through six systems |
| **Maintenance Engineer** | Equipment history + failure patterns + the informal fixes that never made it into the official manual |
| **Plant Manager** | Visibility into downtime risk and how much institutional knowledge is captured vs. still trapped in people's heads |
| **Safety Officer** | Confidence that compliance-relevant knowledge (PESO/OISD-relevant procedures) isn't only known by one retiring person |
| **Reliability Engineer** | Structured failure-pattern data to feed into predictive maintenance planning |
| **Operations Head** | Cross-shift, cross-team consistency — the night shift acts on the same knowledge the day shift does |
| **Compliance Officer** | An auditable trail of *why* a decision was made, not just *that* a work order was closed |

(Full personas with goals, tools-currently-used, and quotes are in the PRD, Section 5.)

---

## 5. User Pain Points

| Persona | Pain point |
|---|---|
| Field Technician | Has to interrupt a senior colleague or dig through paper logs to solve a problem the plant has already solved before |
| Maintenance Engineer | Repeats root-cause diagnosis from scratch because past fixes aren't linked to the equipment they apply to |
| Plant Manager | Has no visibility into how much operational knowledge exists only in one or two people's heads |
| Safety Officer | Discovers safety-critical tribal knowledge only after an incident, when someone says "oh yeah, we knew about that" |
| Reliability Engineer | Failure history is scattered across spreadsheets and PDFs, unusable for pattern detection at scale |
| Operations Head | Inconsistent decisions across shifts because tribal knowledge doesn't transfer at handover |
| Compliance Officer | Can prove *what* was done for an audit, but not *why* — a real gap when a regulator asks for justification |

---

## 6. Value Proposition

**For the plant:** Smriti turns the plant's most fragile, non-transferable asset — the judgment of its most experienced people — into a durable, queryable, compounding institutional asset that survives retirements, shift changes, and staff turnover.

**For the individual technician:** instead of guessing or waiting for a senior colleague, you get the equivalent of asking the most experienced person on-site, instantly, with the reasoning attached.

**For leadership:** a live, quantifiable measure of how much operational knowledge is actually captured versus still trapped in people's heads — turning a fuzzy risk ("we might lose expertise when X retires") into a trackable metric.

---

## 7. Why Competitors Cannot Easily Copy This

Be honest about this one with judges, because a sharp one will ask: **the SQLite-over-Neo4j architecture is not, by itself, a moat.** It's a smart hackathon-stage engineering decision — zero infrastructure, instant local demo, no cluster to provision — but any well-funded incumbent could swap in a proper graph database in a sprint. Don't oversell it as defensibility; sell it as *execution speed*.

The actual moat is upstream of the database choice:

1. **The extraction schema.** Turning messy, informal shift notes and work-order comments into structured decision → symptom → fix relationships is a genuinely hard NLP/ontology problem specific to industrial free text. This is IP in the prompt engineering, few-shot examples, and validation logic — not in the storage layer.
2. **The reinforcement mechanism.** The confidence-scoring loop that upweights technician-verified fixes and downweights rejected ones is a proprietary decision, not a commodity feature. It's what turns a static knowledge base into a genuinely self-learning one.
3. **The compounding dataset.** Every verified decision trace captured is a data asset a competitor starting today doesn't have. This is the real, defensible, data-network-effect moat — and it only exists after deployment, which is exactly why the roadmap in Section 10 treats data accumulation as a strategic asset, not just a feature.

Incumbents' actual structural weakness isn't technical — it's organizational. A centralized Industrial Knowledge Graph inside IBM or SAP requires a master-data-management project measured in quarters. A small team can capture the same kind of experiential data with a lightweight tool in a fraction of the time. **Speed to first captured decision trace is the advantage, not the tech stack.**

---

## 8. Unique Intellectual Property

- The **decision–symptom–fix ontology** and the extraction pipeline that converts unstructured shift/work-order text into it.
- The **hybrid graph schema** that unifies two very different edge types in one structure — *structural* edges (pipe A connects to valve B) and *experiential* edges (symptom X historically resolved by fix Y, with a confidence score) — so a single traversal query returns both the plant's physical topology and its lived history.
- The **feedback-driven confidence-reinforcement algorithm** that adjusts trust in a given fix based on technician accept/reject signals over time.
- The **FastMCP tool surface** itself, as a reusable interoperability layer — exposing plant memory as MCP tools means the same backend can be driven from a custom UI, from Claude Desktop, or from any future MCP-compliant enterprise client, with zero additional UI work per client.

---

## 9. Final MVP Scope — 5 Must-Have Features

I kept your five categories — they're the right five — but re-scoped each one to something a small team can actually finish, demo live, and defend under questioning. Cut items go to Future Scope (Section 10), not the trash — you didn't lose the vision, you sequenced it correctly.

### 1. Industrial Memory Graph (multimodal ingestion + fusion)
- **Why it exists:** This is the core IP — the fusion of structural (P&ID) and experiential (shift notes) data into one graph is what no incumbent does.
- **Business impact:** Directly answers "where does undocumented knowledge live and how do we get at it" — the central pitch of the whole product.
- **Technical impact:** Proves the ontology and the schema work end-to-end on real(-ish) data.
- **Demo impact:** The "graph blooms on screen" moment — highest visual wow-factor in the whole deck.
- **Dev effort / scope call:** Keep P&ID parsing, but **swap self-hosted Qwen2.5-VL for a hosted multimodal API call** (Gemini or Claude vision) — you already have hands-on experience with Gemini's vision API from your DHOS project, so this removes GPU/hosting risk entirely and reuses skills you already have. Pre-select 1–2 P&IDs that parse cleanly rather than promising it works on arbitrary schematics live.

### 2. Self-Learning Feedback Loop
- **Why it exists:** Differentiates you from every "RAG chatbot for documents" competitor — this is the "it gets smarter" claim, made concrete and visible.
- **Business impact:** Directly supports the "compounding asset" pitch — knowledge quality improves with usage instead of decaying.
- **Technical impact:** Simple, reliable to implement (accept/reject → confidence score update) — genuinely one of the lower-risk features on this list.
- **Demo impact:** Visually satisfying — the graph edge updates live in front of judges.
- **Dev effort / scope call:** No changes needed. This is well-scoped as originally written — keep it as-is.

### 3. Proactive Alert Copilot
- **Why it exists:** Moves you from "answers questions" to "acts like a guardian" — this is what separates a copilot from a chatbot.
- **Business impact:** This is the ROI story for a plant manager — catching a failure before it happens, not after.
- **Technical impact:** Simulated telemetry watcher matched against graph patterns — moderate complexity, very achievable.
- **Demo impact:** Very high — **but change the delivery mechanism.** A real native mobile push notification requires app infrastructure you won't build convincingly in a sprint. Instead, wire the alert to a **WhatsApp Business Cloud API or Telegram bot webhook** (a few lines of code, free tier, instant setup) so a judge's own phone can literally buzz mid-demo. Same "wow," a fraction of the engineering risk, and genuinely more memorable than a mocked-up phone screenshot.
- **Dev effort:** Low-to-moderate with the API swap; high and risky as originally scoped.

### 4. FastMCP Universal Integration Mesh
- **Why it exists:** Signals real technical sophistication — almost no other team at this hackathon will have built a native MCP tool mesh instead of a bolted-on chatbot UI.
- **Business impact:** Zero-cost interoperability story — "works inside Claude Desktop or any MCP client, no custom UI required" is a genuinely strong enterprise sales pitch.
- **Technical impact:** Directly demonstrates "Technical Implementation" and "Innovation," two of the five official judging criteria.
- **Demo impact:** Show it live inside an actual MCP client, not just describe it — that's the moment that separates you from teams who only *talk about* MCP.
- **Dev effort / scope call:** Ship exactly 3 tools — `trace_topology_and_history`, `capture_feedback`, `check_compliance_status`. Resist the urge to add a fourth; three well-demoed tools beat five half-working ones.

### 5. Executive Knowledge Health Dashboard
- **Why it exists:** This is the feature that speaks directly to the "Business Viability" judging criterion and to any CXO/VC in the room.
- **Business impact:** Converts an abstract risk ("we might lose expertise") into a trackable number a plant manager would actually put in a quarterly review.
- **Technical impact:** Mostly a read/aggregation layer over data the other four features already produce — genuinely low additional engineering risk.
- **Demo impact:** Strong closing beat before the roadmap slide.
- **Dev effort / scope call:** Build the dashboard with real, single-plant numbers (Institutional Context Retained %, Expert Dependency Score, compliance-flag count). **Cut the cross-plant federated network effect from the MVP entirely** — with one simulated plant's worth of data, you cannot honestly demo "Plant A teaches Plant B," and faking it is exactly the kind of claim a VC-minded judge will probe until it falls apart. Show it as a single roadmap slide instead, framed honestly as "what this becomes at scale."

### What's explicitly cut, and why
| Cut from MVP | Reason | Where it lives now |
|---|---|---|
| Federated cross-plant network effect | Cannot be honestly demoed with one dataset; overclaiming it is a credibility risk under judge questioning | 1-Year roadmap (Section 10) |
| Native mobile push notifications | High infra cost for a marginal demo improvement over a webhook-based alert | Replaced by WhatsApp/Telegram webhook in MVP scope above |
| Self-hosted Qwen2.5-VL for P&ID parsing | GPU/hosting setup risk with no judge-visible upside over a hosted API call | Replaced by hosted vision API (Gemini/Claude) in MVP scope above |
| Real SCADA/EAM API integrations | No real plant to integrate with during a hackathon; simulated telemetry is the honest, correct choice | 6-Month roadmap (Section 10) |

### 48-hour build sequencing (assuming a 2–4 person team)
| Window | Focus | Owner-type |
|---|---|---|
| Hours 0–6 | Schema design (Nodes/Edges tables), seed data prep, P&ID + shift-note sample selection | Whole team |
| Hours 6–16 | Ingestion pipeline: vision API call for P&ID, NLP extraction for shift notes → graph | Backend |
| Hours 16–24 | FastMCP tool mesh (3 tools) wired to the graph | Backend |
| Hours 24–34 | Feedback loop + confidence scoring; alert webhook (WhatsApp/Telegram) | Backend + Frontend |
| Hours 34–42 | Dashboard UI; wire it to real numbers from the graph | Frontend |
| Hours 42–46 | Integration pass, kill anything flaky, freeze scope | Whole team |
| Hours 46–48 | Rehearse the 5-minute script twice, end to end, on the actual demo machine | Whole team |
| **Cut line** | If behind schedule at hour 34, drop the webhook alert first (fall back to an in-app banner) — it's the highest-effort, lowest-IP feature on the list | — |

---

## 10. Future Roadmap

| Horizon | Focus | What's honest to promise |
|---|---|---|
| **3 Months (post-hackathon)** | Harden the MVP; replace simulated telemetry with one real data feed from a design-partner plant; formalize the extraction schema with a labeled validation set | A working pilot with one friendly plant, not a paying customer yet |
| **6 Months (Seed-track)** | Deploy at a mid-sized facility; integrate MCP mesh with one real EAM system via API; zero-workflow-change ingestion from existing free-text fields | First real usage data — the "compounding dataset" IP starts to actually exist here |
| **1 Year (Series A-track)** | Scale the graph to tens of thousands of nodes; move from SQLite to a proper graph store (Neo4j/PostgreSQL+graph extension) as a deliberate engineering upgrade, not a demo requirement; begin the first real (opt-in, anonymized) cross-plant pattern-sharing pilot with 2–3 plants under one operator group | This is where the "federated network effect" claim becomes honest, because it's now technically real |
| **3 Years (Vision)** | Multi-tenant Industrial Memory OS across multiple industrial groups; the accumulated decision-trace dataset becomes the actual product moat | Position as the long-term vision on the final slide — not as a hackathon deliverable |

---

## 11. Success Metrics

**Hackathon-specific (what judges will actually score you on):**
- Live, working demo of all 5 MVP features end-to-end, no mocked screens
- At least one moment where the system does something unprompted (the proactive alert) — this is your strongest "Innovation" signal
- A dashboard number that a plant manager in the room would recognize as a real KPI, not a vanity metric

**Product-specific (for the pitch deck's "how we'll know it's working" slide):**
- % of technician-submitted feedback that results in a confidence-score change (proves the loop is live, not decorative)
- Time-to-answer for a field technician query, before vs. after
- Number of distinct decision-symptom-fix triples captured per week from real shift-note volume
- Expert Dependency Score trend (declining = knowledge successfully distributed, not just retained)

---

## 12. Risks

| Risk | Type | Mitigation |
|---|---|---|
| A judge fact-checks a cited statistic live | Credibility | Use only the verified stats in Section 3; drop or clearly caveat the rest |
| P&ID parsing fails live on an unfamiliar diagram | Technical | Pre-select and pre-test the exact P&ID(s) used in the demo; never invite the audience to upload their own live |
| Telemetry "anomaly" feels obviously scripted | Demo credibility | Frame it honestly as simulated telemetry against real historical failure patterns — judges respect an honest simulation far more than a discovered fake |
| Overclaiming the network-effect feature under questioning | Business credibility | Keep it strictly in the roadmap slide, never in the live MVP demo (see Section 9) |
| Small-team burnout / scope creep mid-build | Execution | Hold the 5-feature line hard; use the cut-line rule in Section 9 |
| "Just another AI-for-maintenance chatbot" first impression | Positioning | Lead every explanation with the fusion of structural + experiential data — that's the one sentence that separates you from every RAG-on-a-manual competitor |

---

## 13. Final Product Vision

Smriti is not a document search tool. It's the memory layer industrial operations have never had: a living graph that fuses what a plant *is* (its physical topology) with what a plant *knows* (the accumulated, often undocumented judgment of the people who run it), and that gets measurably smarter every time a technician confirms or corrects a suggestion. It starts as a hackathon MVP proving the fusion works on one plant's data. It becomes defensible as the decision-trace dataset accumulates with real usage. And at scale, it becomes the connective layer for an entire industrial group's collective memory — the same category-defining ambition as an "Industrial GPT," but earned honestly, one verified fix at a time, instead of claimed on day one.

**One sentence for the close of your pitch:** *"We didn't build a chatbot for your documents. We built the memory your best engineer would leave behind — if memory were something you could actually keep."*
