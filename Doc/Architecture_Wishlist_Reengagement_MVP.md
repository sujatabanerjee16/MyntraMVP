# Myntra Wishlist — Architecture (Comparison MVP)

**Document status:** Living architecture for the shopper product  
**Source of truth:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md) (PRD v3.0)  
**This is not** the discovery-engine dashboard.

**One-liner:** Heart tap names **quality, fit, compare, or occasion**. Those reasons become tabs that help her **decide**. Same-type live rows cluster by **site category + article** (2–5). Price is a fact on the compare card. No shopper inbox. No fake conversion %.

---

## 0. How to read this

| Audience | Sections |
|----------|----------|
| Product / research | §1–4, §8–9, §14 |
| Engineering | §5–7, §10–13 |
| Delivery | §15–18 |

**Supersedes:** F1–F6 “price-drop tag + push as P0” architecture; “side-by-side compare → MVP2”; discovery-engine architecture; UGC-only shopper architecture.

---

## 1. Problem, goal, intent

### 1.1 Problem

Shoppers shortlist **the same kind of garment** and never get a compare surface. They also save to **check quality** or **check the fit**, and those tabs used to show the same empty card.

They still forget *why* they saved, leave discontinued SKUs in the list, and 18–24 users avoid the app when alerts blast — so this prototype **does not show an inbox or alert ⚙️**.

**Primary segment:** 25–35 **Deliberate Planner** (Sujata, Priya).  
**Secondary:** 18–24 **Impulsive Saver** (Kabir) — same compare UI; alerts stay optional.

### 1.2 Goal (north star)

> Help the **hesitant** shopper pick among same-type saves — and answer quality, fit, and occasion on the matching tab.

**Ship metric:** compare opened (CMP-OPEN) and bag from compare (CMP-BAG).  
**Not a ship metric in proto:** wishlist→cart 15% painted on seed checkout.

Diagnostics: cluster shown, in-stock filter used, restock CTR, dead-item action, tag adoption.  
Guardrail: notification opt-out ≤20%; F5 never a push.

### 1.3 Architectural intent

A **wishlist item** is still the unit of persistence. This MVP adds a **derived compare view**:

- `compareClusters(items)` → keys `SiteCat:article`, min 2, max 5, no discontinued, no cross-category mix.
- `compareCards(items, cluster, inStockOnly)` → photo of that SKU, price + cheapest flag, stars, quality note, stock. No colour / design / on-body columns.

Companions: F1 four live tags, F-Q Quality cards, F-FIT fit-from-past-buys, F4 Occasion cards (date optional), F5 dead in-app. F3/F6 may exist on the API; they are **not shopper chrome**.

### 1.4 Principles

1. **Compare is the P0 of this slice.** Folders, stylist-among-saves, share-link are out.
2. **Category + article**, not save-reason, defines a cluster.
3. **Dead SKUs never compare.** They stay on F5.
4. **Photos are this SKU.** Fallback is the product image, not a different garment.
5. **Price is a fact** on the card. It is not a context tag and not a push in this slice.
6. **Tag is optional.** Skip → `tag: null`.
7. **Shopper UI has no inbox and no alert ⚙️.** F5 still works in-app.
8. **F5 is never a push.**
9. **My size is a fit sentence**, not a stock watch. Exact-size restock (if the worker runs) is API-only.
10. **Occasion date is optional.** Batch F4 by date only when a date is set.
11. **No extra PII.**
12. **No invented conversion %, Groq fit score, or 87%.**

---

## 2. Scope

### 2.1 In

| ID | Feature | Pain |
|----|---------|------|
| **F-CMP** | Type clusters + comparison cards + in-stock filter + Not this + bag | PP-CMP |
| F1 | Context tag (`quality_trust` · `size_wait` · `compare` · `occasion` · `null`) | PP3 |
| F-Q | Quality & trust cards (fabric, stars, N reviews, quotes, 2 photos) | PP-Q |
| F-FIT | Fit from past buys on My size | PP-FIT |
| F4 | Occasion tab + optional date (API reminder if date set) | PP3 + deadline |
| F5 | Dead-item **in-app** nudge | PP4 |

### 2.2 Out

- Price-drop **tag** and price-drop **push** (proto `runPriceCheck` returns `sent: 0`)
- Bookmark / How it looks on me as live chips
- Shopper notification inbox or wishlist ⚙️
- Stylist-among-saves, share-link, folders, fit **score** (87%, 8.4/10)
- Mixing site categories
- Discovery dashboard
- Fake wishlist→cart from seed checkout
- Push for dead items
- Groq / LLM fit cards

---

## 3. Who uses it

| Actor | Job |
|-------|-----|
| Deliberate planner | Open Compare; read Quality / My size / Occasion tabs; bag one; clean dead rows |
| Impulsive saver | Same tabs; no inbox blast |
| Growth | CMP-OPEN / CMP-BAG, quality/fit tab opens, tag adoption — real events only |

---

## 4. System context

```
Shopper app (6 wishlist tabs, compare page, tag sheet, bag)
        │     no inbox · no ⚙️
        ▼
Wishlist service  (item + tag + occasionDate)
        │
        ├── derived: compareClusters / compareCards
        ├── derived: qualityBrief / fitFromPastBuys / occasionBrief
        │
        ▼
Cron daily: dead-items ──► F5 in-app flag (never push)
(optional API) restock-check / occasion-check — not shopper chrome
```

No Groq/BGE. No dashboard. Price-check worker may exist in proto but **must not enqueue** a price-drop notification.

---

## 5. Domain model

### 5.1 Wishlist item

| Field | Meaning |
|-------|---------|
| `id` | Wishlist row |
| `user_id` | Shopper |
| `productId` | Style |
| `sku` | Size-specific when known |
| `priceAtSave` / `currentPrice` | Snapshot / latest INR (shown on compare; not a tag) |
| `selectedSize` | Saved size or null |
| `tag` | `quality_trust` \| `size_wait` \| `compare` \| `occasion` \| `null` (`price_drop` / `bookmarking` not offered) |
| `occasionDate` | Optional; asked only after `occasion`; Skip date → `null` |
| `savedAt` | Save time (compare sorts newest first) |
| `status` | `active` \| `purchased` \| `removed` |
| `stockStatus` | `in_stock` \| `oos` \| `discontinued` |
| `oosSince` | First consecutive OOS timestamp (F5) |
| `sizeWatch` | `{ size, active }` if saved size was OOS |
| `catalog` | brand, title, image_url |
| Category | From catalog `SiteCat` (MEN, WOMEN, KIDS, HOME, BEAUTY, GENZ, STUDIO) |

### 5.2 Compare cluster (derived)

| Field | Meaning |
|-------|---------|
| `key` | `WOMEN:kurta` |
| `category` / `article` | Site cat + inferred article |
| `label` | e.g. `3 dresses in Women` |
| `count` | 2–5 |
| `itemIds` | Newest first, capped |

### 5.3 Compare card (derived)

`image_url` (this SKU), `price` / `priceLabel`, `cheapest`, `rating` / `ratingCount`, `description` (quality note), `inStock`. No separate colour / design / on-body fields.

### 5.3b Decision briefs (derived)

| Brief | Code | Used on |
|-------|------|---------|
| `qualityBrief` | `src/shopper/domain/qualityTrust.ts` | Quality & trust tab |
| `fitFromPastBuys` | `src/shopper/domain/fitJudgement.ts` | My size tab |
| `occasionBrief` | `src/shopper/domain/occasionBrief.ts` | Occasion tab |

### 5.4 Notification preferences (F6) — API only

`priceDropAlerts` · `sizeRestockAlerts` · `occasionReminders` may live on the profile. **Shopper wishlist does not expose ⚙️ or an inbox.** Price-drop send is disabled regardless.

### 5.5 Push payload

| Feature | Title / body | Deep link |
|---------|--------------|-----------|
| F3 | Your size is back · size | PDP / wishlist, size pre-selected |
| F4 | Occasion in X days · N items | Wishlist filtered to occasion |

**F5** is not a push. **F2** is not sent.

### 5.6 Size watch

Registered **only at save** if `selectedSize` is OOS. Later OOS without a watch → F5 after 60 days, not F3.

---

## 6. Capabilities

### 6.1 F-CMP — Compare

1. Wishlist GET (or in-memory `store.items`) → `compareClusters`.
2. Compare tab + All-tab banners.
3. Compare page: `compareCards`; optional `inStock=1`.
4. Client-only **Not this** (session hide). If fewer than 2 cards, empty state.
5. Bag uses existing `addToBag`.

**Code:** `src/shopper/domain/compare.ts`. **HTTP:** `GET /wishlist/compare`, `GET /wishlist/compare/:key`.

Article inference: `inferArticleType` plus title overrides (hoodie / jacket / blazer) so those do not collapse into shirt/other.

### 6.2 F1 — Context tag

Four live choices (`quality_trust` · `size_wait` · `compare` · `occasion`); skip → null; date picker only after Occasion (Skip date allowed).

### 6.3 F-Q — Quality & trust

`qualityBrief`: fabric, stars, N reviews, quality quotes, two real photos. No Compare CTA. No fake `x/10`.

### 6.4 F-FIT — My size

`fitFromPastBuys`: `will_fit` / `may_not_fit` / `unsure` from past same-article buys, returns, and runs-small/large. Not availability copy. Bucket is `tag === size_wait` only.

### 6.5 F3 — Restock (API)

Exact saved size if a watch was registered at save; one send per restock; no re-fire after purchase. Not the My size tab.

### 6.6 F4 — Occasion

Tab always shows tagged rows. Date optional. API F4: date required; ≤7 days; batch same date; past date clears tag.

### 6.7 F5 — Dead item

OOS ≥ 60d or discontinued; in-app; once; excluded from clusters.

### 6.8 F6 — Prefs (API)

Toggles may exist on the store. No shopper ⚙️. F5 has no toggle.

---

## 7. Runtime flows

### 7.1 Save

1. Persist item. If size OOS → size watch.
2. Tag sheet → tag / date or null.
3. Next wishlist render may create / enlarge a cluster (no extra write).

### 7.2 Compare

Read-only derivation. No cron. Hide-state is UI-only.

### 7.3 Restock worker (every 6h)

Active size watch + size in stock + F6 + not purchased → F3.

### 7.4 Occasion worker (daily 09:00)

Group by `(user_id, occasionDate)`. If ≤7 days and F6 → one F4.

### 7.5 Dead worker (daily)

Flag OOS-60 / discontinued. Wishlist GET returns dead separately. Compare ignores them.

### 7.6 Price worker

Proto may update `currentPrice`. **Do not send** a price-drop inbox row.

---

## 8. Policy

| ID | Rule |
|----|------|
| CMP1 | Cluster = same `SiteCat` + article; min 2; max 5 |
| CMP2 | Discontinued excluded |
| CMP3 | No cross-category mix |
| CMP4 | Photos / reviews are this SKU; no TTS; no fake quality score |
| CMP5 | Price is display-only; cheapest among **visible** cards |
| TAG1 | Skip → `tag: null`, no re-prompt |
| TAG2 | Date picker only if occasion; no price-drop / bookmark / how-it-looks choice |
| QTY1 | Quality photos are dedicated UGC or type-matched real photos — never a different SKU’s PDP as UGC |
| QTY2 | No Compare CTA on Quality tab; no fake `x/10` |
| FIT1 | My size is a fit sentence from past buys, not “watching size” / restock |
| STK1 | Watch only if size OOS **at save** |
| STK2 | Exact size; no re-fire after purchase |
| OCC1 | Date optional on tab; F4 send requires a date; batch same date |
| OCC2 | Past date → clear tag, no ping |
| DEAD1 | In-app only; once per item; not in compare |
| PREF1 | Toggle OFF stops F3/F4 immediately |
| PREF2 | OS mute: F5 still shows |
| PD0 | No price-drop push in this slice |
| PII1 | Prefs on profile; no new PII |
| CART0 | No fake conversion % |

---

## 9. Experience (shopper)

Myntra-like **web** chrome at `/`. Not the insight dashboard.

| Surface | This MVP |
|---------|----------|
| Home | “From your wishlist” rail |
| Wishlist | Tabs: **All · Compare · Quality & trust · My size · Occasion · No longer available**. No ⚙️. No inbox. |
| Compare page | Price, stars, quality note, Lowest here, Buy this, Not this, bag / PDP |
| Quality cards | Fabric, stars, N reviews, quotes, 2 photos |
| My size cards | Fit verdict + reason from past buys |
| Occasion cards | Label, countdown, date field |
| Tag sheet | 2×2 live intents; date only after Occasion |
| Prefs / inbox | **Not shopper-facing** |
| Bag | Existing path — not a live conversion KPI |

Personas: Sujata (dresses + kurtas), Priya (same), Kabir (shirts).

---

## 10. API

In-memory proto; HTTP in `server/app.ts` mirrors the client.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/wishlist` | items + restocking + dead |
| GET | `/wishlist/compare` | `{ clusters }` |
| GET | `/wishlist/compare/:key` | `{ cluster, cards }`; `?inStock=1` |
| POST | `/wishlist` | tag + occasionDate + product |
| PATCH / DELETE | `/wishlist/:id` | Tag / remove |
| GET / PATCH | preferences | F6 |
| POST | restock / occasion / dead | Workers |
| POST | price-check | **Must not send** F2 |

Register `/wishlist/compare` **before** `/wishlist/:id`.

---

## 11. Data

| Store | Contents |
|-------|----------|
| Wishlist | §5.1 |
| Catalog | `SiteCat` + photos (compare category lookup) |
| Prefs | §5.4 |
| Notification log | F3/F4 idempotency |
| Dead flags | Once-shown |
| Compare | **None** — derived |

---

## 12. Analytics events

| Event | Use |
|-------|-----|
| `compare_cluster_shown` | Cluster available |
| `compare_opened` | CMP-OPEN (`cluster_key`, `count`) |
| `compare_filter_instock` | CMP-FILTER |
| `compare_not_this` | Eliminate |
| `compare_add_to_cart` | CMP-BAG (`item_id`) |
| `wishlist_item_added` | + `tag` |
| `context_tag_set` / `context_tag_skipped` | F1 |
| `restock_notified` / `restock_opened` | F3 |
| `occasion_notified` / `occasion_opened` | F4 |
| `dead_item_shown` / `similar` / `removed` | F5 |
| `wishlist_pref_changed` | Guardrail |
| `wishlist_add_to_cart` | Real cart only |

Do not treat proto checkout as live conversion. Do not emit `price_drop_notified` in this slice.

---

## 13. Flags

| Flag | Default | Meaning |
|------|---------|---------|
| `shop.compare` | on | F-CMP |
| `shop.context_tag` | on | F1 |
| `shop.push_price` | **off** | F2 not this slice |
| `shop.push_restock` | on | F3 |
| `shop.push_occasion` | on | F4 |
| `shop.dead_nudge` | on | F5 |
| `shop.prefs` | on | F6 |
| `shop.internal_orders` | **off** | Live cart join |

---

## 14. Success metrics

| Metric | Target | Proto |
|--------|--------|-------|
| CMP-OPEN | Cluster users open compare | Count |
| CMP-BAG | Bag from compare | Count — no painted % |
| Restock CTR | ≥35% live | Count |
| Dead actioned | ≥40% | Count |
| Tag adoption | ≥50% | Count |
| Opt-out | ≤20% | Count |
| Wishlist → Cart | ≥15% vs ~5% | Unavailable until join |

---

## 15. Delivery phases

See [Implementation_Wishlist_Reengagement_MVP.md](./Implementation_Wishlist_Reengagement_MVP.md).

```
P0–P6 companions (item model, tags, dead)
  → P7 F-CMP clusters + cards
  → P8 Quality / fit / Occasion decision tabs   ← live
```

**Repo map**

| Path | Role |
|------|------|
| `/` → `src/shopper/` | Shopper prototype |
| `src/shopper/domain/compare.ts` | Cluster + cards |
| `src/shopper/domain/qualityTrust.ts` | Quality brief |
| `src/shopper/domain/fitJudgement.ts` | Fit from past buys |
| `src/shopper/domain/occasionBrief.ts` | Occasion label / countdown |
| `server/app.ts` | HTTP |
| `discover.html` → `src/discover/` | Parked discovery dashboard |

---

## 16. Risks

| Risk | Mitigation |
|------|------------|
| Wrong garment in a cluster | `SiteCat` + article; overrides for hoodie/jacket/blazer |
| Fake on-body photos | Dedicated UGC map or this SKU’s image |
| Compare spam as push | Compare is in-app only |
| 18–24 blast fatigue | F6; F5 never push; no F2 send |
| Fake conversion | `shop.internal_orders` off |

---

## 17. Definition of done (architecture)

- [ ] F-CMP: clusters, cards (price / stars / note / Lowest here / Buy this / Not this), filter, bag, no mix, dead excluded, no TTS / fake score
- [ ] F1: four live tags, skip, chip, date only after Occasion
- [ ] F-Q / F-FIT / Occasion tabs as in PRD
- [ ] No shopper inbox / ⚙️
- [ ] No price-drop send; no price-drop / bookmark / how-it-looks save option
- [ ] No dashboard work in the shopper path
- [ ] EdgeCases `EC-COMP-*` + `EC-QTY-*` + `EC-FIT-*` + S0 companions green
