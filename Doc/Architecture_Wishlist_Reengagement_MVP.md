# Myntra Wishlist MVP1 — Architecture

**Document status:** Living architecture for the shopper product  
**Source of truth:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md) (PRD v1.0)  
**This is not** the discovery-engine dashboard.

**MVP1 one-liner:** Turn the wishlist from a passive parking lot into an **active buying companion** — tag *why* the item was saved, then tell the shopper *when* to act (price drop, size back, occasion, or dead item).

---

## 0. How to read this

| Audience | Sections |
|----------|----------|
| Product / research | §1–4, §8–9, §14 |
| Engineering | §5–7, §10–13 |
| Delivery | §15–18 |

**Supersedes:** UGC-only + one-shot price-drop architecture, FrequencyGuard-only shopper architecture, and the discovery-engine architecture that used to live in this file.

---

## 1. Problem, goal, intent

### 1.1 Problem

The wishlist is a parking lot. Users save items and do not act because they forget *why* they saved, they are not told when price drops or a size returns, dead/OOS items sit forever, and 18–24 users avoid the app when alerts blast.

**Primary segment:** 25–35 **Deliberate Planner** (planned, occasion-driven, weekly revisit).  
**Secondary segment:** 18–24 **Impulsive Saver** (large lists, rare revisit, notification-sensitive). Same product — **user-controlled** alerts, not a second app.

### 1.2 Goal (north star)

> Tell users *why* they saved something, and *when* it is time to act.

**Ship metric (PRD):** Wishlist → **Cart** conversion, from ~5% baseline toward ≥15%.  
Diagnostics: price-drop CTR, restock CTR, dead-item action rate, context-tag adoption.  
Guardrail: notification opt-out ≤20%.

Do not invent a live 30-day purchase rate from demo checkout.

### 1.3 Architectural intent

A **wishlist item** is the unit of work. MVP1 adds: **context tag at save** (F1), three **preference-gated pushes** (F2 price, F3 restock, F4 occasion), one **in-app-only** dead-item nudge (F5), and **per-type toggles** (F6).

### 1.4 Principles

1. **All six features are P0.** No P1/P2 in this build. Comparison, folders, fit AI, social share are out.
2. **Tag is optional.** Skip → `tag: null`. No retry, no friction.
3. **Pushes respect F6 and OS mute.** F5 still works when OS notifications are off.
4. **F5 is never a push.** 18–24 called out blast fatigue.
5. **Exact size only** for restock. No “any size is back” dump.
6. **Batch occasion.** Same date → one notification, not one per SKU.
7. **No extra PII.** Prefs live on the user profile. No new identity store.

---

## 2. Scope

### 2.1 In (MVP1)

| ID | Feature | Pain |
|----|---------|------|
| F1 | Context tag on save (`occasion` · `price_drop` · `size_wait` · `bookmarking` · `null`) | PP3 |
| F2 | Price-drop **push** (≥ ₹50 or ≥ 5%, 1 / item / 48h) | PP1 |
| F3 | Size / restock **push** (saved size only) | PP2 |
| F4 | Occasion reminder **push** (date set, ≤7 days, batched) | PP3 + deadline |
| F5 | Dead-item **in-app** nudge (OOS 60d or discontinued) | PP4 |
| F6 | Wishlist alert toggles (price / restock / occasion) | PP5 |

**Lead design:** 25–35 planner. **18–24 constraint:** F6 + F5 in-app only.

### 2.2 Out (MVP1)

- Side-by-side compare, duplicate banner (MVP2)
- Folders / organisation, AI size/fit, social share (post-MVP)
- Discovery-engine dashboard
- Fake wishlist→cart or 30d purchase from seed checkout
- Push for dead items

---

## 3. Who uses it

| Actor | Job |
|-------|-----|
| Deliberate planner (25–35) | Tag intent; get price / size / occasion pings; clean dead rows |
| Impulsive saver (18–24) | Same UI; turn off types they do not want |
| Growth | Wishlist→cart, CTRs, tag adoption, opt-out |

---

## 4. System context

```
Shopper app (wishlist, tag sheet, prefs, bag)
        │
        ▼
Wishlist service  (item + tag + occasionDate + size watch)
        │
        ├── F6 prefs (profile)
        │
        ▼
Cron 6h: price-check ──► F2 push (if toggle + threshold + 48h)
Cron 6h: restock-check ──► F3 push (if toggle + exact size)
Cron daily 09:00: occasion-check ──► F4 push (if toggle + date ≤7d)
Cron daily: dead-items ──► F5 in-app flag (never push)
        │
        ▼
FCM / APNs  (F2, F3, F4 only)
```

No Groq/BGE in MVP1. No dashboard.

---

## 5. Domain model

### 5.1 Wishlist item (PRD)

| Field | Meaning |
|-------|---------|
| `id` | Wishlist row |
| `user_id` | Shopper |
| `productId` | Style |
| `sku` | Size-specific when known |
| `priceAtSave` | Snapshot INR |
| `currentPrice` | Latest INR |
| `selectedSize` | Saved size or null |
| `tag` | `occasion` \| `price_drop` \| `size_wait` \| `bookmarking` \| `null` |
| `occasionDate` | Optional; only meaningful with `occasion` |
| `savedAt` | Save time |
| `status` | `active` \| `purchased` \| `removed` |
| `stockStatus` | `in_stock` \| `oos` \| `discontinued` |
| `oosSince` | First consecutive OOS timestamp (F5) |
| `sizeWatch` | `{ size, active }` if saved size was OOS |

### 5.2 Notification preferences (F6)

| Field | Default |
|-------|---------|
| `priceDropAlerts` | ON |
| `sizeRestockAlerts` | ON |
| `occasionReminders` | ON |

Stored on **user profile**, not device-local.

### 5.3 Push payload

| Feature | Title / body (PRD) | Deep link |
|---------|--------------------|-----------|
| F2 | Price Drop on your Wishlist · item + new/old ₹ | PDP, Add to Cart highlighted |
| F3 | Your size is back · size + units left | PDP, size pre-selected |
| F4 | [Occasion] is in X days · N items | Wishlist filtered to occasion tags |

**F5** is not a push. Card at top of wishlist: See Similar · Remove.

### 5.4 Size watch

Registered **only at save** if `selectedSize` is OOS. Item that was in stock and later goes OOS does **not** get a watch; F5 applies after 60 days.

---

## 6. Capabilities

### 6.1 F1 — Context tag

1. Add to Wishlist → bottom sheet (~30% height, 250ms, auto-dismiss 6s).
2. Four tags, no scroll. Occasion → optional date picker.
3. Dismiss / timeout → save `tag: null`.
4. Chip on card. Long-press → edit tag.

### 6.2 F2 — Price drop

- `currentPrice < priceAtSave` **and** drop ≥ ₹50 **or** ≥ 5% (whichever threshold is smaller).
- Max **1 notification per item per 48 hours**.
- F6 `priceDropAlerts` must be ON.
- Drop then rise → no “price rose” alert.

### 6.3 F3 — Restock

- Watch registered at save if size OOS.
- Fire when that size `in_stock: true`.
- Exact saved size only. One send per restock event per user per item.
- Do not re-fire after purchase.

### 6.4 F4 — Occasion

- Requires `tag === occasion` **and** `occasionDate` set.
- Fire when `days_until_occasionDate <= 7` and date has not passed.
- Batch all items with the same occasion date into **one** push.
- Skip if all those items are purchased.
- After date passes unused: clear occasion tag; item stays; no late ping.

### 6.5 F5 — Dead item

- OOS ≥ 60 consecutive days **or** `discontinued`.
- In-app card at **top** of wishlist. Once per item (dismiss / remove / similar).
- See Similar → category search with matching filters. Remove → delete row.

### 6.6 F6 — Prefs

- Profile → Settings → Notifications → Wishlist Alerts, and ⚙️ on wishlist header.
- Three toggles, default ON. OFF stops that type immediately.
- F5 has no toggle.

---

## 7. Runtime flows

### 7.1 Save

1. Persist item. If size OOS → size watch.
2. Show tag sheet. Persist tag / date or null.
3. Do not register a size watch later if the item later goes OOS.

### 7.2 Price worker (every 6h)

For each active item: compute drop vs `priceAtSave`. If threshold + F6 + 48h window → enqueue F2.

### 7.3 Restock worker (every 6h)

For each active size watch: if size in stock + F6 + not purchased → enqueue F3; close watch for that event.

### 7.4 Occasion worker (daily 09:00)

Group by `(user_id, occasionDate)`. If ≤7 days and F6 → one F4.

### 7.5 Dead worker (daily)

Flag OOS-60 / discontinued. Wishlist GET returns nudge cards first.

---

## 8. Policy

| ID | Rule |
|----|------|
| TAG1 | Skip / timeout → `tag: null`, no re-prompt |
| TAG2 | Date picker only if occasion selected |
| PD1 | ₹50 or 5% (smaller bar); else no send |
| PD2 | 1 / item / 48h |
| PD3 | Notify on drop only |
| STK1 | Watch only if size OOS **at save** |
| STK2 | Exact size; no re-fire after purchase |
| OCC1 | Date required; batch same date |
| OCC2 | Past date → clear tag, no ping |
| DEAD1 | In-app only; once per item |
| PREF1 | Toggle OFF stops that type immediately |
| PREF2 | OS-level mute: F5 still shows |
| PII1 | Prefs on profile; no new PII fields |

---

## 9. Experience (shopper)

Myntra-like **phone** chrome. Not the insight dashboard.

| Surface | MVP1 |
|---------|------|
| Wishlist | Title + count, ⚙️, dead cards on top, item cards with tag chip, stock, price, Add to Cart |
| Tag sheet | Four intents; occasion date optional |
| Prefs | Three toggles |
| PDP from F2/F3 | Deep link; F3 pre-selects size; F2 highlights Add to Cart |
| Inbox / OS shade | F2–F4 copy from PRD |
| Bag / checkout | Existing path. Success is not a live conversion KPI in proto |

---

## 10. API

Prefix `/wishlist` as in the PRD. Proto may implement the same contracts in-memory.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/wishlist/:userId` | Items + dead nudge flags |
| POST | `/wishlist/:userId/items` | Body includes `tag`, `occasionDate`, `selectedSize` |
| PATCH | `/wishlist/:userId/items/:itemId` | Tag / date |
| DELETE | `/wishlist/:userId/items/:itemId` | Remove |
| GET / PATCH | `/wishlist/:userId/preferences` | F6 |
| POST | `/notifications/wishlist/price-check` | Cron 6h |
| POST | `/notifications/wishlist/restock-check` | Cron 6h |
| POST | `/notifications/wishlist/occasion-check` | Cron daily 09:00 |
| POST | `/notifications/wishlist/dead-items` | Cron daily |

---

## 11. Data

| Store | Contents |
|-------|----------|
| Wishlist | §5.1 |
| Prefs | §5.2 |
| Size watches | Per item |
| Notification log | `type`, `itemId(s)`, `sent_at` (48h + batch + once-per-restock) |
| Dead flags | Once-shown per item |

---

## 12. Analytics events

| Event | Use |
|-------|-----|
| `wishlist_item_added` | + `tag` (incl. null) |
| `context_tag_set` / `context_tag_skipped` | F1 adoption |
| `price_drop_notified` / `price_drop_opened` | F2 CTR |
| `restock_notified` / `restock_opened` | F3 CTR |
| `occasion_notified` / `occasion_opened` | F4 |
| `dead_item_shown` / `dead_item_similar` / `dead_item_removed` | F5 |
| `wishlist_pref_changed` | Guardrail |
| `wishlist_add_to_cart` | Ship metric (real cart events only) |

Do not treat proto checkout as live conversion.

---

## 13. Flags

| Flag | Default | Meaning |
|------|---------|---------|
| `shop.context_tag` | on | F1 |
| `shop.push_price` | on | F2 |
| `shop.push_restock` | on | F3 |
| `shop.push_occasion` | on | F4 |
| `shop.dead_nudge` | on | F5 |
| `shop.prefs` | on | F6 |
| `shop.internal_orders` | **off** | Live cart/purchase join |

---

## 14. Success metrics (from PRD)

| Metric | Target |
|--------|--------|
| Wishlist → Cart | ~5% → ≥15% |
| Price-drop CTR | ≥25% |
| Restock CTR | ≥35% |
| Dead items actioned | ≥40% of flagged |
| Context tag adoption | ≥50% of new saves |
| Opt-out (any wishlist alert type) | ≤20% |

Proto UI must not display invented rates. Empty join → “—” / not in prototype.

---

## 15. Delivery phases

See [Implementation_Wishlist_Reengagement_MVP.md](./Implementation_Wishlist_Reengagement_MVP.md).

```
P0 item model
  → P1 F1 tag sheet
  → P2 F6 prefs
  → P3 F2 price drop
  → P4 F3 restock
  → P5 F4 occasion
  → P6 F5 dead nudge
```

F6 is built **before** F2–F4 send.

**Repo map (this codebase)**

| Path | Role |
|------|------|
| `/` (`index.html`) → `src/shopper/` | Shopper prototype (must be brought in line with this PRD) |
| `discover.html` → `src/discover/` | Parked discovery dashboard |
| `src/ui/` | Retired older shopper chrome |

---

## 16. Risks

| Risk | Mitigation |
|------|------------|
| 18–24 blast fatigue | F6 defaults ON but instant OFF; F5 never push |
| Tag skip → no F4 | F4 requires date; F2/F3 still work without tag |
| Restock on wrong size | Exact `selectedSize` |
| Occasion spam | Batch by date |
| Fake conversion | `shop.internal_orders` off |

---

## 17. Definition of done (architecture)

- [ ] F1: tag saves, chip, edit, graceful skip
- [ ] F2: threshold + 48h + F6 + PDP deep link
- [ ] F3: exact size + pre-select + no re-fire after purchase
- [ ] F4: date required, 7-day window, batch, filtered wishlist
- [ ] F5: in-app top card, Similar + Remove, never push
- [ ] F6: three toggles, default ON, profile-persisted, ⚙️ on wishlist
- [ ] PRD edge cases in §18 of EdgeCases
- [ ] No dashboard work in the shopper path
