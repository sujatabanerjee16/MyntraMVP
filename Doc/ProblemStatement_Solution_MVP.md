# 📦 PRD: Myntra Wishlist — Comparison MVP
**Product:** Myntra Wishlist — help the shopper **pick among same-type saves**  
**Version:** 3.1  
**Status:** Source of truth for the shopper prototype (`/` → `src/shopper/`)  
**Platform:** Shopper web prototype (Myntra-like site). Mobile app contracts stay compatible.  
**Research Base:** 6 user interviews + 2 survey datasets; live prototype learning (quality, fit, compare, occasion, dead items, multi-item bag)

---

## 🧭 North Star

> Shoppers save **two or more of the same kind of thing** (kurtas, dresses, shirts) because they are still **hesitant**.  
> The heart tap names why: quality, fit, compare, or an occasion. Those reasons become tabs that **help her decide**, not just file the pile.  
> Same-type saves sit in **Compare** (category + article, trigger at 2+, cap 5). Price is a fact on the card. Dead SKUs stay in-app, never a push.

Companion jobs: **Quality & trust** (reviews, fabric, photos of this type), **My size** (will it fit, from past buys — not stock watch), **Occasion** (when will I wear it), **No longer available**.

---

## 👥 User Segments

### Primary Segment — "Deliberate Planner" (Age 25–35)

| Attribute | Detail |
|---|---|
| Age | 25–35 |
| Shopping Style | Planned, occasion-driven |
| Wishlist Size | 2–50 items (intentional saves) |
| Revisit Frequency | Weekly |
| Why They Wishlist | Same-type shortlists to compare; quality doubt; will it fit; upcoming occasions |
| Primary Trigger to Buy | “I can see quality / fit / the difference” + occasion date |
| Pain with Wishlist | Saves three kurtas and still cannot compare; quality and fit stay unanswered; occasion is a pile name |
| Representative Users | Prototype: **Sujata**, **Priya**. Research: Ragamayi, Snehi, Touqeer |

**Key verbatims (research):**
> *"I've forgotten why I added it, there should be something that reminds me"* — Snehi  
> *"If my size comes in future I get notified, currently it is not there"* — Snehi  
> *"If something is out of stock and they don't intend to restock, wishlist should notify and remove it"* — Ragamayi  

**Key product observation (this MVP):**
> People do not save three dresses because they want three notifications. They save them because they have not **chosen** yet.

---

### Secondary Segment — "Impulsive Saver" (Age 18–24)

| Attribute | Detail |
|---|---|
| Age | 18–24 |
| Shopping Style | Impulsive, scroll-driven |
| Wishlist Size | 100–288 items (saves freely, acts rarely) |
| Revisit Frequency | Rarely |
| Why They Wishlist | Impulse saves while scrolling, “will look later” |
| Primary Trigger to Buy | Need-based; a compare surface when they *do* open the list |
| Pain with Wishlist | Notification overload → app avoidance |
| ⚠️ Key Constraint | Alerts stay **user-controlled**. Compare is in-app — it does not add a push type. |
| Representative Users | Prototype: **Kabir**. Research: Candidate 1 (288 items) |

---

## 🔴 Pain Points this MVP is Solving

| ID | Priority | Pain Point | Who Feels It | Evidence |
|---|---|---|---|---|
| **PP-CMP** | **P0 (primary)** | Same-kind saves never get a compare surface. | Both; planners first | Type clusters + comparison cards |
| **PP-Q** | P0 companion | Saved to check quality — tab shows the same empty card | 25–35 | Quality & trust cluster (199) |
| **PP-FIT** | P0 companion | “Will this fit me?” answered as stock watch, not past buys | 25–35 | Fit (178); My size judges from orders |
| PP3 | P0 companion | No memory of why an item was saved | Both | Heart sheet + tabs |
| PP4 | P0 companion | Dead / discontinued items sit forever | 25–35 | Ragamayi |
| PP5 | P0 guardrail | Notification overload → app avoidance | 18–24 | Shopper UI has **no inbox**; F5 never a push |

### Explicitly **not** a save-reason in this MVP

| ID | Why it is out |
|---|---|
| Price drop as “why you saved” | Monetary incentive is not a context tag. Price is a **fact on the compare card** (incl. “Lowest here”), not a chip like Occasion / My size. |
| Price-drop **push** | Not this slice. Prototype `runPriceCheck` does not send. Do not resurrect “Waiting for Price Drop” on the tag sheet. |
| Fake wishlist→cart % | `shop.internal_orders` is off. Do not paint ~15% or 0% as live conversion. |

---

## ✅ What this MVP Builds (Scope)

| Feature | Pain | Priority |
|---|---|---|
| **F-CMP: Type clusters + comparison cards** | PP-CMP | **P0 primary** |
| F1: Context tag on save | PP3 | P0 companion |
| F-Q: Quality & trust tab | PP-Q | P0 companion |
| F-FIT: Fit from past buys | PP-FIT | P0 companion |
| F4: Occasion date + tab | PP3 + deadline | P0 companion |
| F5: Dead item in-app nudge | PP4 | P0 companion |

Shopper chrome has **no notification inbox** and **no alert-settings ⚙️**. Restock / occasion workers may exist on the API; they are not what the tabs claim.

### Tag set (F1) — what the shopper may pick

| Tag | Sheet label | Tab | What the tab does |
|---|---|---|---|
| `quality_trust` | Check quality first | Quality & trust | Fabric, star rating, **150+ reviews** (display volume), 2–3 quotes on quality / colour / texture, **2 real customer photos** (kids never get women UGC). No Compare link. No fake `x/10`. |
| `size_wait` | Check the fit | My size | **Will it fit**, from past buys (usual size, returns, runs small/large). **Not** “watching size” / availability. |
| `compare` | Compare | Compare | Same type, 2–5, side by side |
| `occasion` | Upcoming Occasion | Occasion | Named occasion + optional date + countdown. Date picker only after this tag. |
| `null` | Skip | — | No chip |

`price_drop`, `bookmarking`, and `styling_unsure` are **not** offered. `price_drop` may exist on the type for older rows.

### ❌ OUT OF SCOPE — this slice

- **Customer-facing Stylist** — no drawer “Stylist”, no home “Styled for you” / “See picks”, no stylist screen. Domain helpers under `stylist.ts` may still power fit / article inference; they are not a shopper product surface.
- Stylist-among-saves (“which of these would suit me”)
- Share-link / social wishlist
- Duplicate-detection banner as a separate product
- Wishlist folders
- AI size/fit as a **score** (87%, 8.4/10). Fit is a **sentence** from past buys.
- Customer-photo quality tool that crops a different SKU’s PDP
- Shopper notification inbox / lock-screen chrome
- Mixing **Women dresses** with **Kids frocks** (or any cross-`SiteCat` mix)
- Price-drop save tag or price-drop push
- Discovery-engine dashboard
- Fake conversion % in the UI

---

## 🏗️ Feature Specifications

---

### F-CMP: Compare same-type saves
**Solves:** PP-CMP — the shortlist never becomes a decision

#### User Story
> As a shopper, when I have saved two or more of the **same article in the same site category**, I want them side by side so I can pick one — price, stars, and a quality note — without scrolling a pile grouped only by save-reason.

#### Clustering

- Key: `{site category}:{article type}` e.g. `WOMEN:dress`, `WOMEN:kurta`, `MEN:shirt`.
- **Trigger:** ≥ **2** live items in the cluster.
- **Cap:** **5** newest saves (by `savedAt`).
- **Live only:** `status === active` and `stockStatus !== discontinued`. Dead SKUs stay on the F5 nudge — they never enter compare.
- **Do not mix categories.** Women dresses ≠ Kids frocks. Men shirts ≠ Studio shirts if those are different `SiteCat` values.
- Skip `article === other` (cannot label the cluster honestly).

#### Surfaces

1. Wishlist **Compare** tab — one row per cluster (“Compare 3 dresses in Women”).
2. Wishlist **All** tab — banners to the same clusters.
3. **Compare page** — cards in a grid.

#### Card fields (required)

| Field | Rule |
|---|---|
| Photo | Catalog image of **this** SKU |
| Price | Current INR. Flag **Lowest here** among the visible cards. Price is a fact, not a save-reason |
| Stars | Customer average + review count. **No** “true to size” |
| Quality note | Short fabric / cut line for this SKU. **No fake 8.4/10** |
| Buy this | Optional pick from past buys — a sentence, not a score |
| Stock | In stock → MOVE TO BAG. OOS → disabled. Discontinued never appears |

Colour, design, and on-body are **not** separate columns. Those jobs live on **Quality & trust**.

#### Controls

- **In stock only** — hide OOS / size-watch rows.
- **Not this** — hide a card for this visit. If fewer than 2 remain, stop comparing (empty copy).
- **MOVE TO BAG** — in-stock only; same multi-item bag path as the rest of the site (`bagItemIds[]`; badge = items + addons).
- Tap image → PDP of **that** item.

#### Acceptance Criteria

- [ ] Sujata sees **dresses and kurtas**; Priya the same; Kabir **shirts** (when ≥2).
- [ ] Cluster does not include the discontinued Anouk kurta.
- [ ] Cards do not show “True to size” or a made-up quality score.
- [ ] In-stock filter hides watching / OOS rows.
- [ ] Bag from compare lands in Shopping Bag with that SKU; a second add keeps the first.
- [ ] Women dresses never cluster with Kids frocks.

---

### F1: Context Tag on Save
**Solves:** PP3

#### User Story
> As a user, when I add an item to my wishlist, I want to name **why** I saved it so the matching tab can help me decide — quality, fit, compare, or an occasion.

#### Flow
```
User taps heart
        ↓
Sheet: "Saving this for…?"   (2×2)
  [ 🔎 Check quality first ]
  [ 📦 Check the fit ]
  [ 🆚 Compare ]
  [ 🎉 Upcoming Occasion ]
        ↓
Occasion → "When is the occasion?"  → Save date / Skip date
Other tags → save immediately
Skip / dismiss → tag: null
```

Auto-dismiss of the add sheet is **paused** while the date step is open.

#### UI Details

- Sheet is non-blocking; Skip is first-class.
- Date picker **only** after Upcoming Occasion. Skip date is allowed (`occasionDate: null`).
- Opening the sheet must **not** auto-select a reason from a leftover click / pointer event. Skip and dismiss never invent a tag.
- Chip on card. Long-press / tap chip → edit.
- `bookmarking`, `styling_unsure`, and `price_drop` are **not** on the sheet.

#### Data (prototype)

```typescript
tag: 'quality_trust' | 'size_wait' | 'compare' | 'occasion' | null
occasionDate: string | null   // only asked after occasion
```

`isLiveTag` = those four values. Older rows may still hold `price_drop` / `bookmarking` on the type.

#### Acceptance Criteria

- [ ] Four live tags; **no** Price Drop, Bookmark, or How it looks.
- [ ] Skip → `tag: null`, no re-prompt.
- [ ] Date picker only after Occasion; Skip date leaves `occasionDate: null`.
- [ ] Chip editable.

---

### F-Q: Quality & trust tab
**Solves:** PP-Q

Not a filter. `QualityCard` uses `qualityBrief`:

- Fabric from catalog / title
- Star rating + **150+ reviews** via `displayReviewCount` (stable display volume; not an invented `x/10`)
- 2–3 quotes via `pickRelevantQuotes` — quality / colour / texture (product-specific)
- **Two photos** labelled **Real customer photo**: dedicated UGC if ≥2 exist; else type-matched pool. **Kids** use kids photo pool only — never women Libas UGC. Never a cropped PDP of a different SKU pretending to be UGC
- MOVE TO BAG
- **No Compare link** on this tab

---

### F-FIT: My size tab — fit from past buys
**Solves:** PP-FIT

The tab answers **will this size fit you**, not “is it in stock.”

- Domain: `fitFromPastBuys` (`src/shopper/domain/fitJudgement.ts`)
- Verdicts: `will_fit` · `may_not_fit` · `unsure`
- Compares saved size vs usual size from past purchases of the **same article**; also review `runs_small` / `runs_large` and same-SKU returns
- Example: Biba Anarkali saved **S**; Sujata bought **M** Anouk kurta → “This may not fit you… smaller than you usually buy”
- `SizeFitCard`: no “Watching size”, “Out of stock”, or restock copy
- Bucket is **only** `tag === size_wait` (not every OOS row)
- Heart hint: “From your past buys — whether this size should fit you”

Size-watch / exact-size restock may still exist on the **API** for OOS-at-save. That is not what the My size tab claims.

---

### F4: Occasion tab (+ optional dated reminder)
**Solves:** PP3 + deadline

- Live save reason and tab: **when will I wear it?**
- `OccasionCard`: occasion label (Friend's Wedding / festive / night out), countdown, date field, MOVE TO BAG
- Date is **optional**. F4 worker (if run) requires `occasion` **and** `occasionDate`, fires when `days_until ≤ 7`, batches same date
- Date passed unused → clear occasion tag; item stays; no late ping
- Shopper UI has **no inbox** for the ping

---

### F5: Dead Item In-App Nudge
**Solves:** PP4

- Discontinued **or** OOS ≥ 60 consecutive days.
- **In-app only. Never a push.**
- Card: won’t be restocked · See Similar · Remove. Once per item.
- Dead SKUs **do not** enter F-CMP clusters.

---

### F3 / F6 — backend only (not shopper chrome)

Shopper wishlist has **no notification inbox** and **no alert-settings ⚙️**. Prefs and restock workers may exist on the store / API. They are not a shopper job in this prototype.

- F3 (if run): watch only if saved size was OOS **at save**; exact size; no re-fire after purchase.
- F6 (if used): OFF stops F3/F4 send. F5 has no toggle. F2 is never sent.

---

## 🗂️ Wishlist Screen — UI Structure

```
Wishlist
├── Header: title + count   (no ⚙️, no inbox)
├── Hint: same types sit together so you can compare
├── Tabs: All | Compare | Quality & trust | My size | Occasion | No longer available
├── All: compare banners + groups by live reason + dead nudge
├── Quality & trust → QualityCard (fabric, stars, 150+ reviews, quality/colour/texture quotes, 2 real customer photos)
├── My size → SizeFitCard (fit sentence from past buys)
├── Occasion → OccasionCard (label, countdown, date)
└── Compare tab → cluster list → Compare page (price, stars, quality note, Lowest here, Buy this, Not this)
```

---

## ⚙️ API (prototype)

```
GET    /wishlist
GET    /wishlist/compare
GET    /wishlist/compare/:key?inStock=1
POST   /wishlist
PATCH  /wishlist/:id
DELETE /wishlist/:id
GET/PATCH preferences
POST   restock / occasion / dead workers
```

Compare routes are registered **before** `/wishlist/:id/...` so `compare` is not parsed as an item id. Keys are `Category:article` (URL-encoded).

---

## ⚠️ Edge Cases (summary)

Full catalog: [EdgeCases_Wishlist_Reengagement_MVP.md](./EdgeCases_Wishlist_Reengagement_MVP.md) (`EC-COMP-*` for compare; do **not** reuse retired discovery `EC-CMP-*`).

| Scenario | Expected |
|---|---|
| 1 item of a type | No cluster |
| 6 kurtas | Show newest 5 |
| Discontinued in the list | F5 only; not in compare |
| Kids frock + Women dress | Separate keys; no mix |
| Skip tag | `null`, no re-prompt |
| Occasion without date | Tab still shows; F4 will not fire |
| My size | Fit sentence, not “watching size” |
| Quality photos | This type / dedicated UGC — never a different SKU’s PDP as UGC; kids ≠ women UGC |
| Quality review count | Display **≥150** (stable hash), not raw sample size |
| Tag sheet open | No auto-pick from leftover click; Skip never tags |
| Multi-item bag | Second `addToBag` keeps the first; badge = bag + addons |
| Stylist chrome | **Absent** (drawer / See picks / stylist screen) |
| Restock other size | No F3 (API) |
| Same occasion date, two SKUs | One F4 (API) |
| Shopper inbox / ⚙️ | **Absent** |
| Demo checkout | No live conversion % |

---

## ✅ Definition of Done

| Feature | Done when |
|---|---|
| F-CMP | Clusters at 2+, cap 5, price / stars / quality note / Lowest here / Buy this / Not this / bag, no TTS / fake score, no category mix, dead excluded |
| F1 | Four live tags (quality, fit, compare, occasion); skip; chip; edit; date only after Occasion |
| F-Q | Quality tab shows fabric, stars, 150+ reviews, quality/colour/texture quotes, 2 real customer photos; kids pool only for kids; no Compare CTA; no fake `x/10` |
| F-FIT | My size shows a fit sentence from past buys; not stock watch; bucket is `size_wait` only |
| F4 | Occasion tab + optional date; skip date allowed; API batch ≤7 days if date set |
| F5 | In-app tab, Similar + Remove, never push, not in compare |
| Bag | Multi-item `bagItemIds[]`; Bag / Checkout list all lines + total; not a live conversion KPI |
| Chrome | No shopper inbox; no wishlist ⚙️; **no Stylist** |
| Honesty | No invented conversion %, no Groq/LLM fit score, no 87% |

---

## 📊 Success Metrics

| Metric | Target | Proto |
|---|---|---|
| **CMP-OPEN** | Shopper with a cluster opens compare | Count in proto |
| **CMP-BAG** | Bag from a compare card / users who opened compare | Count; not a painted % |
| **CMP-FILTER** | In-stock filter used when OOS rows exist | Count |
| Restock CTR | ≥35% when live | Count in proto |
| Dead items actioned | ≥40% of flagged | Count |
| Context tag adoption | ≥50% of new saves tagged | Count |
| Opt-out (any wishlist alert) | ≤20% | Count |
| Wishlist → Cart | ≥15% vs ~5% baseline | **Unavailable** until `shop.internal_orders` |

A filled 15% on this prototype is a **fail**.

---

## 📱 Screens

| Screen | Type |
|---|---|
| Wishlist (6 tabs + banners) | Live |
| Quality / My size / Occasion cards | Live |
| Compare page | Live |
| Tag sheet (2×2) | Live |
| Dead nudge | Live |
| Prefs / inbox | **Not shopper-facing** |
| Stylist | **Removed** |
| PDP / Bag | Live — multi-item bag + checkout |

**Stack:** Vite `/` → `src/shopper/`. Local often `http://127.0.0.1:5174/` or `5175`. Production: https://myntramvp.vercel.app/. Code: https://github.com/sujatabanerjee16/MyntraMVP. Personas: **Sujata** (default WOMEN), Priya, Kabir (GENZ). Home cats: MEN · WOMEN · KIDS · BEAUTY · GENZ.

---

## Changelog

| Version | Notes |
|---|---|
| 3.1 | Remove customer Stylist chrome. Multi-item bag. Quality: 150+ reviews, colour/texture quotes, Real customer photo, kids photo pool. Tag sheet no auto-select. |
| 3.0 | Live reasons: quality, fit, compare, occasion. Decision tabs. Compare cards without colour/design/on-body columns. No shopper inbox / ⚙️. |
| 2.0 | Comparison MVP (superseded tag set) |

*Comparison MVP v3.1 | Aligns docs with the live shopper prototype. Research still 6 interviews + 2 surveys. Do not put a full last name on the research slide.*
