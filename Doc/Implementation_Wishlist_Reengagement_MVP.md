# Myntra Wishlist MVP1 — Implementation

**Source of truth:** [Architecture_Wishlist_Reengagement_MVP.md](./Architecture_Wishlist_Reengagement_MVP.md)  
**PRD:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md)

MVP1 = **F1 context tag** + **F2 price-drop push** + **F3 restock push** + **F4 occasion push** + **F5 dead-item in-app nudge** + **F6 alert prefs**.  
Not the discovery dashboard. Not UGC-as-the-product. Not compare / folders / fit AI.

---

## 0. How to use this plan

| Role | Start here |
|------|------------|
| Delivery | §1 roadmap, each **Exit gate**, §8 DoD |
| Engineering | Work + contracts |
| QA | Demo scripts + [EdgeCases](./EdgeCases_Wishlist_Reengagement_MVP.md) |

**Stack (this repo):** Vite + React + TypeScript. Shopper entry: `/` → `src/shopper/`. In-memory store + cron buttons for proto. No Groq/BGE.

---

## 1. Roadmap

```
P0 Item model (tag, size, prices, stock)
  → P1 F1 context tag sheet
  → P2 F6 notification prefs
  → P3 F2 price-drop push
  → P4 F3 size restock push
  → P5 F4 occasion reminder
  → P6 F5 dead-item nudge
```

F6 ships **before** any F2–F4 send.

| Phase | Feature | Depends |
|-------|---------|---------|
| **P0** | Schema, seed, wishlist chrome, ⚙️ stub | — |
| **P1** | F1 tag sheet + chip + long-press edit | P0 |
| **P2** | F6 three toggles, profile persist | P0 |
| **P3** | F2 threshold + 48h + deep link | P2 |
| **P4** | F3 size watch + exact-size ping | P2 |
| **P5** | F4 date + 7-day batch + filter | P1, P2 |
| **P6** | F5 60d / discontinued card | P0 |

**Minimum demo:** P0–P3 (tag + prefs + price drop). Full PRD DoD = P0–P6.

---

## 2. Cross-cutting rules

1. Skip tag → `null`. No re-prompt.
2. F2/F3/F4 respect F6 immediately.
3. F5 is **never** a push.
4. Price: ≥ ₹50 **or** ≥ 5% (smaller bar). Max 1 / item / 48h.
5. Restock: exact saved size; watch only if OOS **at save**.
6. Occasion: date required; batch same date; no ping after date passed.
7. Dead: OOS 60 consecutive days or discontinued; once per item.
8. Do not show live wishlist→cart % from demo checkout.
9. Each phase ends with a **demo script**.

---

## Phase 0 — Item model

**Goal:** Rows match PRD `WishlistItem` + stock / size-watch fields.

### Work

- [ ] Fields: `productId`, `priceAtSave`, `currentPrice`, `selectedSize`, `tag`, `occasionDate`, `savedAt`, `stockStatus`, `oosSince`, `sizeWatch`.
- [ ] Seed: planner user with mixed tags; one OOS-at-save size; one bookmark; one long-OOS / discontinued candidate.
- [ ] Wishlist layout: title + count, ⚙️, cards (image, brand, name, price, stock, Add to Cart).
- [ ] Measurement: wishlist→cart **unavailable** until `shop.internal_orders` on.

### Exit

- [ ] Wishlist renders seed items; no fake 15% conversion.

### Demo

1. Open `/`.
2. Wishlist shows items and stock. No conversion KPI.

---

## Phase 1 — F1 Context tag

**Goal:** Save flow tags intent.

### Work

- [ ] Add to Wishlist → sheet “Saving this for…?” four tags, ≤300ms, auto-dismiss 6s.
- [ ] Occasion → optional date picker.
- [ ] Dismiss / timeout → `tag: null`.
- [ ] Chip on card. Long-press → edit.
- [ ] `POST /wishlist/:userId/items` includes tag + date.

### Exit

- [ ] All four tags visible without scroll.
- [ ] Skip does not re-prompt.
- [ ] Occasion picker only after 🎉.

### Demo

1. Add an item (or proto “Add to wishlist”).
2. Tag Price Drop → chip on card.
3. Add another, dismiss sheet → no chip.
4. Long-press → change to Occasion + date.

---

## Phase 2 — F6 Prefs

**Goal:** Guardrail before any push.

### Work

- [ ] Screen: Price Drop / Size Back / Occasion toggles, default ON.
- [ ] ⚙️ on wishlist header + Profile path (proto: ⚙️ is enough).
- [ ] PATCH prefs; persist on user profile.
- [ ] OFF stops that type on the next worker tick (immediate in proto).

### Exit

- [ ] Defaults ON. OFF is respected by later phases.

### Demo

1. ⚙️ → all ON.
2. Turn Price Drop OFF. Later P3 drop does not notify.

---

## Phase 3 — F2 Price drop

**Goal:** Push when drop meets threshold.

### Work

- [ ] Worker / proto control: set `currentPrice`.
- [ ] Gate: threshold + F6 + 48h + active item.
- [ ] Copy from PRD. Deep link PDP with Add to Cart highlighted.
- [ ] In proto: inbox/bell stands in for FCM.

### Exit

- [ ] ₹40 drop does **not** fire (unless 5% is smaller — use a high-price SKU to prove ₹50 vs 5%).
- [ ] Qualifying drop → one card. Second drop inside 48h → no send.
- [ ] Toggle OFF → no send.

### Demo

1. Prefs ON. Drop Libas (or seed SKU) past threshold.
2. Bell → PRD copy → PDP.
3. Drop again immediately → no second ping.
4. Toggle OFF, reset, drop → silent.

---

## Phase 4 — F3 Restock

**Goal:** Exact saved size back in stock.

### Work

- [ ] On save, if size OOS → `sizeWatch`.
- [ ] Worker flips size in stock → F3 if F6 on and not purchased.
- [ ] Deep link PDP with that size selected.
- [ ] In-stock-at-save then later OOS → **no** watch.

### Exit

- [ ] Other sizes back → no ping.
- [ ] Purchase → no re-fire.
- [ ] Toggle OFF → no send.

### Demo

1. Seed OOS size-M item. Flip M in stock → one “Your size is back.”
2. Flip size L only → silent.
3. Buy, restock again → silent.

---

## Phase 5 — F4 Occasion

**Goal:** One reminder ≤7 days before a dated occasion.

### Work

- [ ] Only if `occasionDate` set.
- [ ] Proto: “advance clock to 6 days before.”
- [ ] Batch same date → 1 notification.
- [ ] Open → wishlist filtered to those items.
- [ ] Date passed unused → clear tag, no ping.

### Exit

- [ ] Tag without date → no F4.
- [ ] Two items, one date → one ping.
- [ ] Past date → no ping.

### Demo

1. Two items, same wedding date.
2. Jump to T−6 days → one notification.
3. Open → filtered list.

---

## Phase 6 — F5 Dead item

**Goal:** In-app cleanup, no push.

### Work

- [ ] Flag discontinued **or** OOS ≥ 60 days.
- [ ] Card at **top**: won’t restock · See Similar · Remove.
- [ ] Shown once per item.
- [ ] Confirm **no** inbox/push row.

### Exit

- [ ] Card on top. Similar and Remove work.
- [ ] Dismiss / act → no repeat.
- [ ] OS notify off → card still there.

### Demo

1. Seed discontinued / 60d OOS item.
2. Wishlist top card. Remove or Similar.
3. Bell has no dead-item message.

---

## 3. What we will not implement in these phases

- Discovery dashboard / Ask AI
- Compare-all, duplicate banner, folders, fit AI, social share
- Push for dead items
- Live wishlist→cart from seed checkout
- UGC gallery as a required MVP1 feature (not in this PRD)

---

## 4. Test matrix

| Case | P0 | P1 | P2 | P3 | P4 | P5 | P6 |
|------|----|----|----|----|----|----|-----|
| Skip tag → null | | x | | | | | |
| Prefs OFF blocks type | | | x | x | x | x | |
| Threshold / 48h | | | | x | | | |
| Exact size only | | | | | x | | |
| Occasion batch + date required | | | | | | x | |
| Dead in-app only | | | | | | | x |
| No fake conversion | x | | | | | | x |

---

## 5. Proto controls (not production)

| Control | Phase |
|---------|--------|
| Add to wishlist + tag sheet | P1 |
| ⚙️ prefs | P2 |
| Drop price on seed SKU | P3 |
| Restock saved size / other size | P4 |
| Advance clock (occasion / 60d OOS) | P5 / P6 |
| Reset demo | P0 |

---

## 6. Open questions (do not block P0–P2)

| Question | Default |
|----------|---------|
| Occasion label text if user only picks a date | Use date; title “Occasion” |
| “See Similar” filter set | Category + gender + price band of the dead item |
| Units-left in F3 body | Show if inventory API has it; else omit count |

---

## 7. Sprint packaging

| Sprint | Focus |
|--------|--------|
| 1 | P0 + P1 + P2 |
| 2 | P3 + P4 |
| 3 | P5 + P6 + metric wiring |

---

## 8. Definition of done

Matches PRD § Definition of Done:

- [ ] F1 tag saves, chip, editable, graceful skip
- [ ] F2 fires on threshold, respects toggle, deep-links PDP
- [ ] F3 exact size, pre-select, no re-fire after purchase
- [ ] F4 batches, 7 days before, filters wishlist
- [ ] F5 in-app top card, Similar + Remove, not a push
- [ ] F6 three toggles, default ON, profile sync, ⚙️ on wishlist
- [ ] EdgeCases S0/S1 green for shipped phases
- [ ] No invented conversion % in the UI
