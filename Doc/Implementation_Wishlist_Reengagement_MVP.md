# Myntra Wishlist — Implementation (Comparison MVP)

**Source of truth:** [Architecture_Wishlist_Reengagement_MVP.md](./Architecture_Wishlist_Reengagement_MVP.md)  
**PRD:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md)

This slice = **help hesitant buyers decide**: Compare (F-CMP) plus **Quality & trust**, **My size** (fit from past buys), and **Occasion**.  
Live save reasons: `quality_trust` · `size_wait` · `compare` · `occasion` · `null`.  
Shopper chrome has **no inbox** and **no alert ⚙️**.  
Not the discovery dashboard. Not Bookmark / How it looks. Not a price-drop save tag or push. Not a fake fit score.

---

## 0. How to use this plan

| Role | Start here |
|------|------------|
| Delivery | §1 roadmap, each **Exit gate**, §8 DoD |
| Engineering | Work + contracts |
| QA | Demo scripts + [EdgeCases](./EdgeCases_Wishlist_Reengagement_MVP.md) |

**Stack (this repo):** Vite + React + TypeScript. Shopper entry: `/` → `src/shopper/` (dev often `http://127.0.0.1:5174/` or `5175`). Production: https://myntramvp.vercel.app/. In-memory store. No Groq/BGE.

---

## 1. Roadmap

```
P0–P6  Companions (item model, tags, dead; prefs/restock API-only)
  → P7 F-CMP clusters + compare page
  → P8 Quality / fit / Occasion decision tabs     ← live
```

Price-drop **push** (old P3 / F2) is **not** implemented as a send. `runPriceCheck` / `dropPrice` must stay at `sent: 0`.

| Phase | Feature | Depends | Status in this repo |
|-------|---------|---------|---------------------|
| **P0** | Schema, seed, wishlist chrome (no ⚙️) | — | Done |
| **P1** | F1 tag sheet (quality / fit / compare / occasion) | P0 | Done |
| **P2** | F6 toggles | P0 | API only — **not shopper chrome** |
| **P3** | F2 price-drop send | — | **Out** — do not send |
| **P4** | F3 exact-size restock | P2 | API only — My size tab is **fit**, not restock |
| **P5** | F4 dated occasion | P1 | Done — tab + optional date |
| **P6** | F5 dead in-app | P0 | Done |
| **P7** | **F-CMP compare** | P0 | Done |
| **P8** | Quality / fit / Occasion **cards** | P1, P7 | **Live** |

**Minimum demo:** Sujata — Compare dresses + kurtas; Quality tab (fabric, stars, quotes, 2 photos); My size (Biba S vs usual M); Occasion date. Kabir — shirts. No inbox.

---

## 2. Cross-cutting rules

1. Skip tag → `null`. No re-prompt. No price-drop / bookmark / how-it-looks on the sheet.
2. Shopper UI has **no inbox** and **no ⚙️**.
3. F5 is **never** a push. Discontinued rows **never** enter compare.
4. My size tab: fit from past buys. Not “watching size.”
5. Occasion: date optional; date picker only after Occasion; Skip date allowed.
6. Compare: `{SiteCat}:{article}`, min 2, max 5, no cross-category mix.
7. Compare cards: price, stars, quality note, Lowest here, Buy this, Not this. No colour/design/on-body columns. No TTS / fake x/10.
8. Quality photos: dedicated UGC or type-matched real photos — never a different SKU’s PDP as UGC.
9. Do not show live wishlist→cart % from demo checkout.

---

## Phase 0 — Item model *(shipped)*

**Goal:** Rows match wishlist + stock / size-watch / catalog category.

### Work

- [x] Fields: `productId`, prices, `selectedSize`, `tag`, `occasionDate`, `savedAt`, `stockStatus`, `oosSince`, `sizeWatch`.
- [x] Seed personas: Sujata, Priya, Kabir.
- [x] Wishlist chrome **without** ⚙️ / inbox.
- [x] Measurement: wishlist→cart **unavailable**.

### Exit / demo

Open `/`. Wishlist renders. No fake 15%.

---

## Phase 1 — F1 Context tag *(shipped)*

### Work

- [x] Sheet 2×2: Check quality first, Check the fit, Compare, Upcoming Occasion. **No** Price Drop, Bookmark, or How it looks.
- [x] Skip → `null`. Occasion date **only** after Occasion; Skip date allowed.
- [x] Chip + edit.

### Demo

1. Heart a catalog item → four live tags, no price-drop.
2. Skip → no chip. Occasion → date step → Skip date still saves `occasion`.

---

## Phase 2 — F6 Prefs *(API only — not shopper chrome)*

### Work

- [x] Prefs may exist on the store. Wishlist **must not** show ⚙️ or an inbox.
- [x] Price Drop send is disabled.

### Demo

Open wishlist as Sujata. Confirm **no** gear icon and **no** notification inbox.

---

## Phase 3 — F2 Price drop *(out of this MVP)*

- [x] `dropPrice` / `runPriceCheck` return `sent: 0`, `suppressed: ["disabled"]`.
- [x] No Price drop tab. No inbox “Price Drop on your Wishlist”.

Do **not** add a price-drop tag or push as part of P7.

---

## Phase 4 — F3 Restock *(shipped)*

### Demo

1. Seed Biba size S OOS. Restock S → one “Your size is back.”
2. Wrong size → silent. Toggle off → silent.

---

## Phase 5 — F4 Occasion *(shipped)*

### Demo

1. Heart → Upcoming Occasion → pick a date **or** Skip date.
2. Occasion tab: label + countdown (or “When will you wear it?”).
3. Seed Flared Ethnic Maxi / Pleated Party Dress tagged `occasion` with dates after the demo clock so the ≤7-day worker does not fire.

---

## Phase 6 — F5 Dead item *(shipped)*

### Demo

Anouk discontinued on **No longer available**. Bell has no dead-item message. Row is **not** in Compare.

---

## Phase 7 — F-CMP Compare *(this slice)*

**Goal:** Same-type live saves, side by side, so the shopper can pick.

### Work

- [x] `src/shopper/domain/compare.ts` — `compareClusters`, `compareCards`, `COMPARE_MIN=2`, `COMPARE_MAX=5`.
- [x] Article + `SiteCat` key; hoodie/jacket/blazer title overrides; skip `other`; skip discontinued.
- [x] Seed enough same-type SKUs: kurtas for Sujata/Priya; shirts for Kabir (plus existing dresses / linen).
- [x] Distinct catalog images within a cluster.
- [x] API: `getCompareClusters`, `getCompare(key, inStockOnly)`.
- [x] HTTP: `GET /wishlist/compare`, `GET /wishlist/compare/:key?inStock=1` (registered before `/:id`).
- [x] UI: Compare tab, All-tab banners, Compare page (price, stars, quality note, Lowest here, Buy this, Not this, stock).
- [x] In stock only; Not this (session hide); MOVE TO BAG; PDP.
- [x] Tests: domain + API + UI flow.
- [ ] Browser pass: Sujata dresses **and** kurtas; Kabir shirts; filter; Not this until fewer than 2 left; bag.

### Exit

- [ ] Cluster at 2+; cap 5; dead excluded; no Women dress + Kids frock mix.
- [ ] Cards have no TTS and no fake quality score.
- [ ] In-stock filter hides watching / OOS.
- [ ] Bag from compare works.
- [ ] Docs (this file + PRD + architecture + edge + eval) match the product.

### Demo (P7)

1. Open `/` as **Sujata** → Wishlist.
2. All tab shows banners e.g. **Compare 3 dresses in Women** and **Compare N kurtas in Women**.
3. Compare tab lists the same clusters.
4. Open dresses: cards show **price, stars, quality note, Lowest here**. **Buy this** may appear. **Not this** / MOVE TO BAG. No “True to size”. No 8.4/10. No colour/design/on-body columns.
5. Check **In stock only**. **Not this** on one card. **MOVE TO BAG** on another → Shopping Bag.
6. Back → open kurtas. Discontinued Anouk is not there (it stays under No longer available).
7. Profile → **Kabir** → Wishlist → Compare shirts.

---

## Phase 8 — Quality / fit / Occasion cards *(live)*

### Work

- [x] `qualityBrief` + `QualityCard` on Quality & trust. No Compare CTA.
- [x] `fitFromPastBuys` + `SizeFitCard` on My size. No watching-size copy.
- [x] `occasionBrief` + `OccasionCard` on Occasion.
- [x] Tabs CSS: 6 columns.

### Demo

1. Wishlist → **Quality & trust**: fabric, stars, N reviews, quality quotes, two photos. No Compare link.
2. **My size**: Biba S vs usual M → “may not fit” sentence. No “Watching size”.
3. **Occasion**: named occasion + date field.

---

## 3. What we will not implement in P7/P8

- Discovery dashboard / Ask AI
- Bookmark / How it looks as live chips
- Shopper inbox or wishlist ⚙️
- Stylist-among-saves, share-link, folders, fit **score**
- Price-drop tag or push
- Push for dead items
- Live wishlist→cart from seed checkout
- Mixing site categories to “fill” a cluster
- Groq / LLM fit cards

---

## 4. Test matrix

| Case | P1 | P5 | P6 | P7 | P8 |
|------|----|----|----|----|-----|
| Skip tag → null | x | | | | |
| No price-drop / bookmark / how-it-looks | x | | | | x |
| Date only after Occasion; Skip date OK | x | x | | | |
| Dead in-app only; not in compare | | | x | x | |
| Cluster ≥2, cap 5 | | | | x | |
| No category mix | | | | x | |
| Compare cards: price / stars / note / Lowest here | | | | x | |
| No TTS / fake score | | | | x | x |
| Compare → bag | | | | x | |
| Quality: fabric, stars, quotes, 2 photos; no Compare CTA | | | | | x |
| My size: fit sentence, not watching size | | | | | x |
| No shopper inbox / ⚙️ | x | | | | x |
| No fake conversion | x | | x | x | x |

---

## 5. Proto controls (not production)

| Control | Phase |
|---------|--------|
| Add to wishlist + tag sheet | P1 |
| Drop price on seed SKU | P3 — updates price **only**, no ping |
| Advance clock (occasion / 60d OOS) | P5 / P6 |
| Persona switch (Sujata / Priya / Kabir) | P7 / P8 demo |
| Reset demo | P0 |

---

## 6. Open questions (do not block P7)

| Question | Default |
|----------|---------|
| Persist “Not this” across refresh | No — session only |
| Quality when fabric unknown | First review sentence, else “See reviews on the card” |
| Units-left in F3 body | Show if inventory has it; else omit |
| Occasion label if user only picks a date | Use date; title “Occasion” |

---

## 7. Sprint packaging

| Sprint | Focus |
|--------|--------|
| Done | P0–P7, F2 send disabled, no shopper inbox |
| This | P8 Quality / fit / Occasion cards + doc alignment |

---

## 8. Definition of done

Matches PRD § Definition of Done:

- [x] F1 four live tags, chip, editable, graceful skip; date only after Occasion; no price-drop / bookmark / how-it-looks
- [x] F-Q Quality cards; F-FIT fit from past buys; Occasion cards
- [x] F5 in-app, Similar + Remove, not a push
- [x] No shopper inbox / ⚙️
- [x] F-CMP clusters + cards (price / stars / note / Lowest here / Buy this / Not this) + filter + bag; no mix; dead excluded
- [ ] EdgeCases S0/S1 green for P7/P8 (`EC-COMP-*`, `EC-QTY-*`, `EC-FIT-*`)
- [ ] No invented conversion % in the UI
- [ ] Five `Doc/*.md` files describe **this** product
