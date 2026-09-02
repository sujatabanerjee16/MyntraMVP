# Myntra Wishlist — Implementation (Comparison MVP)

**Source of truth:** [Architecture_Wishlist_Reengagement_MVP.md](./Architecture_Wishlist_Reengagement_MVP.md)  
**PRD:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md)

This slice = **F-CMP type clusters + comparison cards**.  
Companions already in the prototype: **F1 tags** (no price-drop choice), **F3 restock**, **F4 occasion**, **F5 dead in-app**, **F6 prefs**.  
Not the discovery dashboard. Not stylist-among-saves. Not share-link. Not a price-drop save tag or push.

---

## 0. How to use this plan

| Role | Start here |
|------|------------|
| Delivery | §1 roadmap, each **Exit gate**, §8 DoD |
| Engineering | Work + contracts |
| QA | Demo scripts + [EdgeCases](./EdgeCases_Wishlist_Reengagement_MVP.md) |

**Stack (this repo):** Vite + React + TypeScript. Shopper entry: `/` → `src/shopper/` (dev often `http://127.0.0.1:5174/`). In-memory store + cron buttons for proto. No Groq/BGE.

---

## 1. Roadmap

```
P0–P6  Companions (item model, tags, prefs, restock, occasion, dead)
  → P7 F-CMP clusters + compare page     ← current slice
```

Price-drop **push** (old P3 / F2) is **not** implemented as a send. `runPriceCheck` / `dropPrice` must stay at `sent: 0`.

| Phase | Feature | Depends | Status in this repo |
|-------|---------|---------|---------------------|
| **P0** | Schema, seed, wishlist chrome, ⚙️ | — | Done |
| **P1** | F1 tag sheet (four tags, no price-drop) | P0 | Done |
| **P2** | F6 toggles | P0 | Done |
| **P3** | F2 price-drop send | — | **Out** — do not send |
| **P4** | F3 exact-size restock | P2 | Done |
| **P5** | F4 dated occasion batch | P1, P2 | Done |
| **P6** | F5 dead in-app | P0 | Done |
| **P7** | **F-CMP compare** | P0 | **This MVP** |

**Minimum demo for this slice:** P7 on Sujata (dresses + kurtas), Kabir (shirts), in-stock filter, bag from compare. Companions still demoable.

---

## 2. Cross-cutting rules

1. Skip tag → `null`. No re-prompt. No price-drop tag on the sheet.
2. F3/F4 respect F6 immediately.
3. F5 is **never** a push. Discontinued rows **never** enter compare.
4. Restock: exact saved size; watch only if OOS **at save**.
5. Occasion: date required; batch same date; no ping after date passed.
6. Compare: `{SiteCat}:{article}`, min 2, max 5, no cross-category mix.
7. Compare cards: this SKU’s photos; reviews without “true to size”; quality without a fake x/10; price as a fact.
8. Do not show live wishlist→cart % from demo checkout.
9. Each phase ends with a **demo script**.

---

## Phase 0 — Item model *(shipped)*

**Goal:** Rows match wishlist + stock / size-watch / catalog category.

### Work

- [x] Fields: `productId`, prices, `selectedSize`, `tag`, `occasionDate`, `savedAt`, `stockStatus`, `oosSince`, `sizeWatch`.
- [x] Seed personas: Sujata, Priya, Kabir.
- [x] Wishlist chrome + ⚙️.
- [x] Measurement: wishlist→cart **unavailable**.

### Exit / demo

Open `/`. Wishlist renders. No fake 15%.

---

## Phase 1 — F1 Context tag *(shipped)*

### Work

- [x] Sheet: Occasion, My size, How it looks on me, Bookmark. **No** Waiting for Price Drop.
- [x] Skip → `null`. Occasion date optional.
- [x] Chip + edit. `styling_unsure` → photos of this SKU, reviews without TTS.

### Demo

1. Heart a catalog item → four tags, no price-drop.
2. Skip → no chip. Bookmark → chip only after opening wishlist (home rail hides Bookmark).

---

## Phase 2 — F6 Prefs *(shipped)*

### Work

- [x] Price Drop / Size Back / Occasion toggles. ⚙️ on wishlist.
- [x] OFF stops F3/F4. Price Drop send is already disabled.

### Demo

⚙️ → turn Size Back off → restock control stays silent.

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

Two items, same date → one batched ping → wishlist filtered to occasion.

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
- [x] UI: Compare tab, All-tab banners, Compare page (colour, design, on-body, review, quality, price + Lowest here, stock).
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
4. Open dresses: cards show Colour / Design / On-body / Review / Quality / Stock. No “True to size”. No 8.4/10.
5. Check **In stock only**. **Not this** on one card. **MOVE TO BAG** on another → Shopping Bag.
6. Back → open kurtas. Discontinued Anouk is not there (it stays under No longer available).
7. Profile → **Kabir** → Wishlist → Compare shirts.

---

## 3. What we will not implement in P7

- Discovery dashboard / Ask AI
- Stylist-among-saves, share-link, folders, fit AI score
- Price-drop tag or push
- Push for dead items
- Live wishlist→cart from seed checkout
- Mixing site categories to “fill” a cluster

---

## 4. Test matrix

| Case | P1 | P4 | P5 | P6 | P7 |
|------|----|----|----|----|-----|
| Skip tag → null | x | | | | |
| No price-drop tag / send | x | | | | x |
| Exact size only | | x | | | |
| Occasion batch + date required | | | x | | |
| Dead in-app only; not in compare | | | | x | x |
| Cluster ≥2, cap 5 | | | | | x |
| No category mix | | | | | x |
| In-stock filter | | | | | x |
| No TTS / fake score | | | | | x |
| Compare → bag | | | | | x |
| No fake conversion | x | | | x | x |

---

## 5. Proto controls (not production)

| Control | Phase |
|---------|--------|
| Add to wishlist + tag sheet | P1 |
| ⚙️ prefs | P2 |
| Drop price on seed SKU | P3 — updates price **only**, no ping |
| Restock saved size / other size | P4 |
| Advance clock (occasion / 60d OOS) | P5 / P6 |
| Persona switch (Sujata / Priya / Kabir) | P7 demo |
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
| Done | P0–P2, P4–P6, F2 send disabled |
| This | P7 compare + doc alignment |

---

## 8. Definition of done

Matches PRD § Definition of Done:

- [x] F1 four tags, chip, editable, graceful skip; no price-drop option
- [x] F3 exact size, no re-fire after purchase
- [x] F4 batches, 7 days before, filters wishlist
- [x] F5 in-app, Similar + Remove, not a push
- [x] F6 toggles, ⚙️
- [ ] F-CMP clusters + cards + filter + Not this + bag; no mix; dead excluded; honest reviews/quality
- [ ] EdgeCases S0/S1 green for P7 (`EC-COMP-*`)
- [ ] No invented conversion % in the UI
- [ ] Five `Doc/*.md` files describe **this** product, not “compare → MVP2”
