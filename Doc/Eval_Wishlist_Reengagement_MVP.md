# Myntra Wishlist — Evaluation (Comparison MVP)

**Sources:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md); [Architecture_Wishlist_Reengagement_MVP.md](./Architecture_Wishlist_Reengagement_MVP.md) §12, §14; [Implementation_Wishlist_Reengagement_MVP.md](./Implementation_Wishlist_Reengagement_MVP.md) P7  
**QA:** [EdgeCases_Wishlist_Reengagement_MVP.md](./EdgeCases_Wishlist_Reengagement_MVP.md)

This file defines *how we know this MVP worked*. It scores the **shopper** product with **compare as the primary outcome**. It does **not** score the discovery-engine dashboard. It does **not** treat a painted 15% cart rate as success.

**Supersedes:** discovery-engine eval (cite-or-refuse, G-COMP, D9-as-success); UGC + one-shot price-drop eval; “F2 CTR is the ship metric.”

---

## 0. Evaluation intent

This MVP exists so a shopper who saved **two or more of the same type** can **see them together and pick**. Tags, restock, occasion, and dead-item cleanup support that decision — they are not the north star anymore.

```
Save same-type items
  → cluster (category + article)
  → open compare cards
  → filter in-stock / hide “Not this”
  → bag one
  → without fake scores, wrong-SKU photos, or a conversion %
```

**A filled wishlist→cart % from demo checkout is a fail** until `shop.internal_orders` is on.

### 0.1 What we are *not* evaluating as success

| Tempting metric | Why not |
|-----------------|--------|
| Wishlist → cart 15% painted in proto | No cart join |
| Price-drop CTR | F2 is not sent in this slice |
| Discovery Ask AI citation rate | Wrong product |
| UGC tap CTR as the ship metric | Supporting, not the north star |
| Raw notification volume | 18–24 harm |
| Fake quality 8.4/10 | Honesty fail |

---

## 1. Layers

A later layer does not skip an earlier fail.

| Layer | When | Question | Pass |
|-------|------|----------|------|
| **L0 Constraint** | Every review | No fake conversion? F5 never push? No F2 send? Photos are this SKU? No TTS / fake score? | EdgeCases S0 green |
| **L1 Compare adoption** | P7 | Do clusters appear? Do people open them? | CMP-SHOWN, CMP-OPEN |
| **L2 Decision quality** | P7 | Right cluster, filter, hide, bag? | EC-COMP battery |
| **L3 Companion + guardrail** | P1–P6 | Tags skippable? Restock exact? Occasion batched? 18–24 can mute? | F1/F3/F4/F6 |
| **L4 Outcome** | Live cart join | Wishlist → cart; compare→bag as explanation | Real events only |

**Minimum proto bar:** L0 + P7 demo (Sujata dresses + kurtas, Kabir shirts, filter, bag) + companions still demoable.  
**Ship bar:** L0 + L2 battery + L1 counts instrumented + L3 opt-out health. L4 waits for join.

---

## 2. Questions the eval must answer

| # | Question | Layer | Evidence |
|---|----------|-------|----------|
| Q1 | Do ≥2 same-type saves become a cluster in the right category? | L1/L2 | `compareClusters` / UI banners |
| Q2 | Does opening compare show honest cards (colour, design, this-SKU photo, review, quality, price, stock)? | L2 | Screenshot + EC-COMP-009–011 |
| Q3 | Does in-stock filter hide watching / OOS? | L2 | EC-COMP-007 |
| Q4 | Can they bag from compare? | L2 | CMP-BAG; bag screen |
| Q5 | Is discontinued kept off compare? | L0/L2 | EC-COMP-002, EC-DEAD-007 |
| Q6 | Are Women dresses kept off Kids frocks? | L2 | EC-COMP-003 |
| Q7 | Do saves still get a usable why (or honest null)? | L3 | Tag distribution + skip |
| Q8 | Does restock mean **their** size? | L3 | Size-watch vs send |
| Q9 | Do occasion pings batch and stay dated? | L3 | F4 payload item count |
| Q10 | Did we avoid blasting 18–24 (and avoid F2 entirely)? | L0/L3 | No price-drop inbox; OPT |

---

## 3. Metric dictionary

### 3.1 Ship / proto targets

| ID | Metric | Formula | Target | Phase 1 proto |
|----|--------|---------|--------|----------------|
| **CMP-SHOWN** | Cluster available | Users with ≥1 cluster / wishlist users with ≥2 same-type saves | ~100% of eligible | Assert in tests + demo |
| **CMP-OPEN** | Compare opened | Opens / users who saw a cluster | Directional ↑ | Count; no fake % |
| **CMP-BAG** | Bag from compare | Add-to-bag from compare card / compare opens | Directional ↑ | Count |
| **CMP-FILTER** | In-stock filter | Filter on / compare sessions with an OOS row | Directional | Count |
| **CTR-STK** | Restock CTR | Opens / F3 sent | ≥35% live | Count in proto |
| **DEAD-ACT** | Dead items actioned | Similar or Remove / flagged | ≥40% | Count |
| **TAG-ADOPT** | Context tag adoption | New saves with `tag ≠ null` / new saves | ≥50% live | Count |
| **OPT** | Opt-out | Users who turn off ≥1 F3/F4 type / exposed | ≤20% | Count |
| **NS-CART** | Wishlist → Cart | Real cart join | ≥15% vs ~5% | **Unavailable** |

Eval **fails** if NS-CART is a number from seed checkout.  
Eval **fails** if CMP-BAG is replaced by a fake 15%.

### 3.2 Honesty / constraint

| ID | Fail if |
|----|---------|
| **G-CART** | UI/API shows a live conversion % without `shop.internal_orders` |
| **G-PUSH** | F5 emitted as push / inbox “notification” |
| **G-PD** | Any price-drop notification sent |
| **G-TTS** | Compare or styling review shows “true to size” |
| **G-SCORE** | Quality shown as `x/10` or similar invented rating |
| **G-PHOTO** | On-body photo is a different SKU / category |
| **G-MIX** | Cluster mixes `SiteCat` (e.g. WOMEN dress + KIDS frock) |
| **G-DEAD** | Discontinued id appears in `itemIds` of a cluster |
| **G-PREF** | F3/F4 sent while that toggle is OFF |
| **G-SIZE** | F3 sent for a size other than `selectedSize` |
| **G-BATCH** | Two F4 pushes for the same user+date in one check |

---

## 4. Event contract

From architecture §12. Required for L1–L4:

| Event | Properties |
|-------|------------|
| `compare_cluster_shown` | `cluster_key`, `count` |
| `compare_opened` | `cluster_key`, `count` |
| `compare_filter_instock` | `cluster_key`, `on` |
| `compare_not_this` | `item_id` |
| `compare_add_to_cart` | `item_id`, `cluster_key` |
| `wishlist_item_added` | `tag` (nullable), `has_occasion_date` |
| `context_tag_set` / `context_tag_skipped` | `tag` |
| `restock_notified` / `restock_opened` | `item_id`, `size` |
| `occasion_notified` / `occasion_opened` | `occasion_date`, `item_count` |
| `dead_item_shown` / `dead_item_similar` / `dead_item_removed` | `item_id` |
| `wishlist_pref_changed` | `channel`, `on` |
| `wishlist_add_to_cart` | `item_id` — **real cart only** |

Do **not** require `price_drop_notified` for this MVP (G-PD = 0 events).

---

## 5. Layer L1 — Compare adoption

| Check | Pass |
|-------|------|
| Eligible list has banners + Compare tab | Sujata dresses + kurtas; Kabir shirts |
| Open compare | Heading matches cluster label; ≥2 cards |
| Empty | Copy tells them to save two of the same type — not a fake pair |

---

## 6. Layer L2 — Decision battery

Automated (map to EdgeCases):

| Battery | Expect |
|---------|--------|
| Cluster ≥2 | EC-COMP-001, 004 |
| Cap 5 | EC-COMP-005 |
| Dead excluded | EC-COMP-002, EC-DEAD-007 |
| No category mix | EC-COMP-003, 018 |
| In-stock filter | EC-COMP-006–007 |
| Not this | EC-COMP-008 |
| Honesty | EC-COMP-009–011; G-TTS, G-SCORE, G-PHOTO |
| Bag | EC-COMP-012 |
| Route vs `:id` | EC-COMP-019 |

**Independent PM task (~10 min):** Sujata → Compare dresses → scan photos (same garment) → In stock only → Not this → bag. Then kurtas (no Anouk discontinued). Switch to Kabir → shirts.

**Fail if:** they think proto checkout is the 15% KPI; they see TTS or 8.4/10; they see a kids frock in Women dresses; they get a price-drop ping.

---

## 7. Layer L3 — Companions + guardrail

| Check | Pass |
|-------|------|
| Skip tag | EC-TAG-001 |
| No price-drop tag | EC-TAG-002 |
| Exact size | EC-STK-002–003; G-SIZE |
| Occasion batch | G-BATCH; EC-OCC-002 |
| Dead never push | G-PUSH |
| Immediate OFF | G-PREF = 0 in the sample window |
| OPT | ≤20% after a meaningful window (not day-0 of proto) |

---

## 8. Layer L4 — Outcome (deferred until cart join)

When `shop.internal_orders` is on:

- Activate NS-CART vs ~5% baseline.
- Keep CMP-BAG as the **explanation** of how compare contributed — not a painted substitute.
- Do not start L4 on seed orders.

---

## 9. Capability scorecard

| ID | Feature | Eval focus |
|----|---------|------------|
| **F-CMP** | Compare | CMP-OPEN, CMP-BAG, G-MIX, G-DEAD, G-TTS, G-SCORE |
| F1 | Context tag | TAG-ADOPT, skip, no price-drop option |
| F3 | Restock | CTR-STK, G-SIZE |
| F4 | Occasion | G-BATCH, filter deep link |
| F5 | Dead nudge | DEAD-ACT, G-PUSH, G-DEAD |
| F6 | Prefs | OPT, ⚙️ |
| F2 | Price drop | **G-PD** (must be zero sends) |

---

## 10. Phase eval gates

| Phase | Must pass |
|-------|-----------|
| P0 | G-CART |
| P1 | EC-TAG-001; EC-TAG-002 |
| P2 | ⚙️ present |
| P3 | G-PD |
| P4 | G-SIZE |
| P5 | G-BATCH; EC-OCC-001 |
| P6 | G-PUSH |
| P7 | G-MIX, G-DEAD, G-TTS, G-SCORE, CMP-SHOWN, bag from compare |

---

## 11. Scorecards (print)

### 11.1 L0

| Check | Pass? |
|-------|-------|
| No fake cart % | |
| F5 not a push | |
| No price-drop send | |
| No TTS / fake quality score | |
| Photos are this SKU | |

### 11.2 PM demo

| Check | Pass? |
|-------|-------|
| Sujata: dresses + kurtas compare | |
| In-stock filter | |
| Not this | |
| Compare → bag | |
| Dead Anouk not in compare | |
| Kabir: shirts | |
| Skip tag; no price-drop choice | |
| Wrong size restock silent | |
| Occasion batch | |
| Dead card, empty bell | |

---

## 12. Reporting cadence

| Cadence | What |
|---------|------|
| Every proto drop | L0 + P7 PM demo |
| Weekly once compare is in front of people | CMP-OPEN, CMP-BAG, CMP-FILTER, OPT |
| After cart join | NS-CART vs 5% + CMP-BAG as a slice |

---

## 13. Failure modes

| Observation | Meaning | Not this |
|-------------|---------|----------|
| NS-CART is — | Join off; correct | “Product is 0%” |
| Clusters missing | Seed / article inference | “Users don’t compare” |
| High Not this | Cards unhelpful or wrong SKU photos | “Kill compare” |
| High OPT | Too many F3/F4 or copy | “Kill F6” |
| Low restock CTR | Timing or deep link | “Size doesn’t matter” |
| Dead cards ignored | Similar results poor | “Users like clutter” |

---

## 14. Related documents

| Doc | Role |
|-----|------|
| PRD | North star = pick among same-type saves; F-CMP + companions |
| Architecture | Derived clusters, APIs, policy CMP1–5 |
| Implementation | P7 work + demo |
| EdgeCases | `EC-COMP-*`; eval assumes S0/S1 pass |

---

## 15. Document control

| Version | Notes |
|---------|--------|
| 1.0 | Shopper re-engagement (retired) |
| 2.0 | Discovery-engine eval (retired) |
| 3.0 | Wishlist F1–F6 cart/CTR eval (superseded as ship bar) |
| 4.0 | Comparison MVP: CMP-OPEN / CMP-BAG; G-PD; no fake 15% |

If clustering rules or honesty constraints change, update §3 and §6 in the same change.
