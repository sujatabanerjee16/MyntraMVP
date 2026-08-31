# Myntra Wishlist MVP1 — Evaluation

**Sources:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md); [Architecture_Wishlist_Reengagement_MVP.md](./Architecture_Wishlist_Reengagement_MVP.md) §12, §14; [Implementation_Wishlist_Reengagement_MVP.md](./Implementation_Wishlist_Reengagement_MVP.md) P0–P6  
**QA:** [EdgeCases_Wishlist_Reengagement_MVP.md](./EdgeCases_Wishlist_Reengagement_MVP.md)

This file defines *how we know MVP1 worked*. It scores the **shopper** product (F1–F6). It does **not** score the discovery-engine dashboard.

**Supersedes:** discovery-engine eval (cite-or-refuse, G-COMP, D9-as-success) and the UGC + one-shot price-drop eval.

---

## 0. Evaluation intent

MVP1 exists to make the wishlist an **active buying companion**: capture *why* they saved, tell them *when* to act, and let 18–24 turn the noise off.

```
Save → optional context tag
     → preference-gated pushes (price / size / occasion)
     → in-app dead-item cleanup
     → more wishlist → cart
     → without blasting people off the app
```

**A filled wishlist→cart % from demo checkout is a fail** until `shop.internal_orders` is on.

### 0.1 What we are *not* evaluating as success

| Tempting metric | Why not |
|-----------------|--------|
| Discovery Ask AI citation rate | Wrong product |
| UGC tap CTR as the ship metric | Not in this PRD |
| “0%” or “15%” painted on a proto with no cart join | Fake |
| Raw notification volume | 18–24 harm |
| Token / chat vanity | N/A |

---

## 1. Layers

A later layer does not skip an earlier fail.

| Layer | When | Question | Pass |
|-------|------|----------|------|
| **L0 Constraint** | Every review | Prefs and F5-never-push held? No invented conversion? | EdgeCases S0 green; no fake % |
| **L1 Adoption** | P1+ | Do people tag? Can they skip? | Tag rate; skip path used without friction |
| **L2 Notification quality** | P3–P5 | Right trigger, cap, batch, deep link? | Threshold / 48h / exact size / occasion batch |
| **L3 Guardrail** | P2+ | Can 18–24 shut types off? | Opt-out ≤20%; toggle immediate |
| **L4 Outcome** | Live cart join | Wishlist → cart toward ≥15% | Real events only |

**Minimum proto bar:** L0 + demo of F1–F6 (Implementation P0–P6).  
**Ship bar:** L0 + L2 battery + L3 opt-out health + L4 instrumentation (even if the 15% target is still ramping).

---

## 2. Questions the eval must answer

| # | Question | Layer | Evidence |
|---|----------|-------|----------|
| Q1 | Do saves get a usable why (or an honest null)? | L1 | Tag distribution + skip rate |
| Q2 | Do price drops notify at the PRD threshold, not every ₹1? | L2 | F2 logs vs price feed |
| Q3 | Does restock mean **their** size? | L2 | Size-watch vs send |
| Q4 | Do occasion pings batch and stay dated? | L2 | F4 payload item count |
| Q5 | Do dead items get cleaned without a push? | L0/L2 | F5 shown; push log empty for dead |
| Q6 | Can users kill each alert type? | L3 | Prefs + suppressed sends |
| Q7 | Did wishlist → cart move vs ~5% baseline? | L4 | Cart join |
| Q8 | Did we stay under 20% opt-out? | L3 | Prefs OFF / unsubscribe |

---

## 3. Metric dictionary

### 3.1 Ship / PRD targets

| ID | Metric | Formula | Target | Phase 1 proto |
|----|--------|---------|--------|----------------|
| **NS-CART** | Wishlist → Cart | Users (or items) adding a wishlisted SKU to cart / wishlist users (define cohort in instrumentation) | ≥15% (from ~5%) | **Unavailable** until cart join |
| **CTR-PD** | Price-drop CTR | Opens / F2 sent | ≥25% | Count in proto; no fake % |
| **CTR-STK** | Restock CTR | Opens / F3 sent | ≥35% | Count in proto |
| **DEAD-ACT** | Dead items actioned | Similar or Remove / flagged | ≥40% | Count |
| **TAG-ADOPT** | Context tag adoption | New saves with `tag ≠ null` / new saves | ≥50% | Count |
| **OPT** | Opt-out | Users who turn off ≥1 wishlist alert type / users exposed to F6 | ≤20% | Count |

Eval **fails** if NS-CART is a number from seed checkout.

### 3.2 Honesty / constraint

| ID | Fail if |
|----|---------|
| **G-CART** | UI/API shows a live conversion % without `shop.internal_orders` |
| **G-PUSH** | F5 emitted as push / inbox “notification” |
| **G-PREF** | F2/F3/F4 sent while that toggle is OFF |
| **G-SIZE** | F3 sent for a size other than `selectedSize` |
| **G-BATCH** | Two F4 pushes for the same user+date in one check |

---

## 4. Event contract

From architecture §12. Required for L2–L4:

| Event | Properties |
|-------|------------|
| `wishlist_item_added` | `tag` (nullable), `has_occasion_date` |
| `context_tag_set` / `context_tag_skipped` | `tag` |
| `price_drop_notified` / `price_drop_opened` | `item_id`, `old_price`, `new_price` |
| `restock_notified` / `restock_opened` | `item_id`, `size` |
| `occasion_notified` / `occasion_opened` | `occasion_date`, `item_count` |
| `dead_item_shown` / `dead_item_similar` / `dead_item_removed` | `item_id` |
| `wishlist_pref_changed` | `channel`, `on` |
| `wishlist_add_to_cart` | `item_id` — **real cart only** |

---

## 5. Layer L1 — Tag adoption

| Check | Pass |
|-------|------|
| Skip path | EC-TAG-001 in automated tests |
| Adoption | TAG-ADOPT tracked; ≥50% is a **live** target, not a proto paint |
| Edit | Long-press changes chip without duplicate rows |

---

## 6. Layer L2 — Notification battery

Automated (map to EdgeCases):

| Battery | Expect |
|---------|--------|
| F2 threshold | EC-PD-002–004 |
| F2 48h | EC-PD-005 |
| F2 rise | EC-PD-001 |
| F3 exact size | EC-STK-002–003 |
| F3 no watch if in-stock at save | EC-STK-001 |
| F4 date required / batch / filter | EC-OCC-002, 003, 007 |
| F4 past date | EC-OCC-001 |
| F5 never push | EC-DEAD-001 |

**Independent PM task (~15 min):** tag a save; fire a price drop; fire a restock of the **wrong** size (must stay silent); fire occasion batch; see a dead card with no bell row; turn F2 off and confirm silence.

**Fail if:** they think proto checkout is the 15% KPI; they get a dead-item push; they get an L-size ping for an M watch.

---

## 7. Layer L3 — Guardrail

| Check | Pass |
|-------|------|
| Defaults ON | EC-PREF-003 |
| Immediate OFF | G-PREF = 0 in the sample window |
| OPT | ≤20% after a meaningful exposure window (not day-0 of proto) |
| 18–24 qualitative | No “I closed the app because of wishlist spam” in follow-up if OPT healthy |

---

## 8. Layer L4 — Outcome (deferred until cart join)

When `shop.internal_orders` is on:

- Activate NS-CART vs ~5% baseline.
- Keep F1–F5 as **explanations**, not replacements for the cart metric.
- Do not start L4 on seed orders.

---

## 9. Capability scorecard

| ID | Feature | Eval focus |
|----|---------|------------|
| F1 | Context tag | TAG-ADOPT, skip, edit |
| F2 | Price drop | CTR-PD, threshold, 48h, G-PREF |
| F3 | Restock | CTR-STK, G-SIZE |
| F4 | Occasion | G-BATCH, filter deep link |
| F5 | Dead nudge | DEAD-ACT, G-PUSH |
| F6 | Prefs | OPT, ⚙️, profile sync |

---

## 10. Phase eval gates

| Phase | Must pass |
|-------|-----------|
| P0 | G-CART |
| P1 | EC-TAG-001; skip + chip |
| P2 | Defaults ON; ⚙️ |
| P3 | F2 battery; G-PREF |
| P4 | G-SIZE |
| P5 | G-BATCH; EC-OCC-001 |
| P6 | G-PUSH; card on top |

---

## 11. Scorecards (print)

### 11.1 L0

| Check | Pass? |
|-------|-------|
| No fake cart % | |
| F5 not a push | |
| Prefs respected in sample | |

### 11.2 PM demo

| Check | Pass? |
|-------|-------|
| Tag + skip | |
| Price drop → PDP | |
| Wrong size silent | |
| Occasion batch | |
| Dead card, empty bell | |
| Toggle kills F2 | |

---

## 12. Reporting cadence

| Cadence | What |
|---------|------|
| Every proto drop | L0 + PM demo |
| Weekly once F2–F4 are on | CTR-PD, CTR-STK, OPT, G-PREF |
| After cart join | NS-CART vs 5% baseline |

---

## 13. Failure modes

| Observation | Meaning | Not this |
|-------------|---------|----------|
| NS-CART is — | Join off; correct | “Product is 0%” |
| High skip on tags | Sheet friction or no need | “Users have no intent” |
| High OPT | Too many pushes or copy | “Kill F6” |
| Low restock CTR | Timing or deep link | “Size doesn’t matter” |
| Dead cards ignored | Similar results poor | “Users like clutter” |

---

## 14. Related documents

| Doc | Role |
|-----|------|
| PRD | Features, AC, metrics, edge table |
| Architecture | Model, cron, policy |
| Implementation | Phase gates |
| EdgeCases | Correctness; eval assumes S0/S1 pass |

---

## 15. Document control

| Version | Notes |
|---------|--------|
| 1.0 | Shopper re-engagement (retired) |
| 2.0 | Discovery-engine eval (retired for this PRD) |
| 3.0 | Wishlist MVP1 F1–F6: cart, CTRs, tag adoption, opt-out |

If PRD targets or thresholds change, update §3 and §6 in the same change.
