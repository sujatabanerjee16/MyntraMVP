# 📦 PRD: Myntra Wishlist — Comparison MVP
**Product:** Myntra Wishlist — help the shopper **pick among same-type saves**  
**Version:** 2.0  
**Status:** Source of truth for the shopper prototype (`/` → `src/shopper/`)  
**Platform:** Shopper web prototype (Myntra-like site). Mobile app contracts stay compatible.  
**Research Base:** 6 user interviews + 2 survey datasets; live prototype learning (tags, restock, occasion, dead items)

---

## 🧭 North Star

> Shoppers save **two or more of the same kind of thing** (kurtas, dresses, shirts) because they are still choosing.  
> Today the wishlist groups by **why they saved** (occasion, size, how it looks). It never puts those same-type saves **side by side**.  
> This MVP’s job is to **help them pick** — colour, design, on-body photos of **that** SKU, reviews, a honest quality signal, price as a fact, stock — then bag one.

Companion jobs (already in the prototype, still required): remember *why* they saved (without treating a sale as the reason), ping when **their size** is back, remind dated occasions, clean dead SKUs in-app, and let 18–24 mute alerts.

---

## 👥 User Segments

### Primary Segment — "Deliberate Planner" (Age 25–35)

| Attribute | Detail |
|---|---|
| Age | 25–35 |
| Shopping Style | Planned, occasion-driven |
| Wishlist Size | 2–50 items (intentional saves) |
| Revisit Frequency | Weekly |
| Why They Wishlist | Same-type shortlists to compare; upcoming occasions; waiting for **their** size |
| Primary Trigger to Buy | “I can finally see the difference” + occasion deadline + size back |
| Pain with Wishlist | Saves three kurtas / dresses and still cannot compare them; intent fades; size restock is silent |
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
| **PP-CMP** | **P0 (primary)** | Same-kind saves never get a compare surface. List is grouped by save-reason, not garment type. | Both; planners first | Product cut: type clusters + comparison cards |
| PP3 | P0 companion | No memory of why an item was saved | Both | Snehi; 18–24 forget saves quickly |
| PP2 | P0 companion | No ping when the **saved size** restocks | 25–35 | Snehi; Touqeer lost a purchase |
| PP4 | P0 companion | Dead / discontinued items sit forever | 25–35 | Ragamayi |
| PP5 | P0 guardrail | Notification overload → app avoidance | 18–24 | Candidate 1 |

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
| F3: Size / restock push | PP2 | P0 companion |
| F4: Occasion reminder push | PP3 + deadline | P0 companion |
| F5: Dead item in-app nudge | PP4 | P0 companion |
| F6: Notification preference settings | PP5 | P0 guardrail |

### Tag set (F1) — what the shopper may pick

| Tag | Chip / tab | Push? |
|---|---|---|
| `occasion` | Occasion | F4 if a date is set |
| `size_wait` | My size | F3 if size was OOS **at save** |
| `styling_unsure` | How it looks on me | None — customer photos + reviews on the card / PDP |
| `bookmarking` | Bookmark | None |
| `null` | (no chip) | Skip / timeout |

`price_drop` is **not** offered on the sheet. It may exist on the type for older rows; it must not appear as a tab or save option.

### ❌ OUT OF SCOPE — this slice

- Stylist-among-saves (“which of these would suit me”)
- Share-link / social wishlist
- Duplicate-detection banner as a separate product
- Wishlist folders
- AI size/fit as a score
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
> As a shopper, when I have saved two or more of the **same article in the same site category**, I want them side by side so I can pick one without scrolling a list grouped by occasion vs size vs styling.

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
| Colour | From the piece (title / pictured colour) — not a generic palette |
| Design | Cut / print / silhouette of **this** SKU |
| On-body photo | **This SKU**. Libas uses dedicated customer photos. Others use this product’s image — never a different dress or saree passed off as this one |
| Review | Stars + comment **without** “true to size” |
| Quality | Fabric or a short review line. **No fake 8.4/10** |
| Price | Current INR. Flag **Lowest here** among the visible cards. Price is a fact, not a save-reason |
| Stock / size | In stock + saved size, or watching size / OOS. Discontinued never appears |

#### Controls

- **In stock only** — hide OOS / size-watch rows.
- **Not this** — hide a card for this visit. If fewer than 2 remain, stop comparing (empty copy).
- **MOVE TO BAG** — in-stock only; same bag path as the rest of the site.
- Tap image → PDP of **that** item.

#### Acceptance Criteria

- [ ] Sujata sees **dresses and kurtas**; Priya the same; Kabir **shirts** (when ≥2).
- [ ] Cluster does not include the discontinued Anouk kurta.
- [ ] Cards do not show “True to size” or a made-up quality score.
- [ ] In-stock filter hides watching / OOS rows.
- [ ] Bag from compare lands in Shopping Bag with that SKU.
- [ ] Women dresses never cluster with Kids frocks.

---

### F1: Context Tag on Save
**Solves:** PP3

#### User Story
> As a user, when I add an item to my wishlist, I want to tag my intent so that when I come back, I know why it's there.

#### Flow
```
User taps "Add to Wishlist" / heart
        ↓
Sheet: "Saving this for…?"
  [ 🎉 Upcoming Occasion ]
  [ 📦 Waiting for My Size ]
  [ ✨ Not sure how it will look on me ]
  [ 🤔 Just Bookmarking ]
        ↓
User taps a tag  →  Tag saved on wishlist card
User Skip / dismiss  →  Item saves with no tag
```

#### UI Details

- Sheet is non-blocking; Skip is first-class.
- Occasion → optional date picker (feeds F4).
- Chip on card. Long-press / tap chip → edit.
- Bookmark does **not** show on the home “From your wishlist” rail (intentional saves only).
- `styling_unsure` unlocks customer photos + reviews for **that** SKU (no TTS line).

#### Data (prototype)

```typescript
tag: 'occasion' | 'size_wait' | 'styling_unsure' | 'bookmarking' | null
occasionDate: string | null
```

#### Acceptance Criteria

- [ ] Four tags visible; **no** “Waiting for Price Drop”.
- [ ] Skip → `tag: null`, no re-prompt.
- [ ] Occasion date picker only after Occasion.
- [ ] Chip editable; `styling_unsure` shows photos of this piece.

---

### F3: Size / Restock Push Notification
**Solves:** PP2

- Register a size watch **only if** the selected size is OOS **at save**.
- Fire when **that exact size** is in stock. Other sizes silent.
- Deep-link wishlist/PDP with that size. Do not re-fire after purchase.
- Respects F6 Size Back-in-Stock.

---

### F4: Occasion Reminder Notification
**Solves:** PP3 + deadline

- Requires `occasion` **and** `occasionDate`.
- Fires when `days_until_occasionDate <= 7` and the date has not passed.
- Same date → **one** batched notification.
- Open → wishlist filtered to those occasion items.
- Date passed unused → clear occasion tag; item stays; no late ping.
- Respects F6 Occasion Reminders.

---

### F5: Dead Item In-App Nudge
**Solves:** PP4

- Discontinued **or** OOS ≥ 60 consecutive days.
- **In-app only. Never a push.**
- Card: won’t be restocked · See Similar · Remove. Once per item.
- Dead SKUs **do not** enter F-CMP clusters.

---

### F6: Notification Preference Settings
**Solves:** PP5

```
Wishlist Notifications
────────────────────────────────────────
💸 Price Drop Alerts          [ toggle — unused for send in this slice ]
📦 Size Back-in-Stock         [ ON  ● ]
🎉 Occasion Reminders         [ ON  ● ]
```

- ⚙️ on wishlist header. Defaults ON (Kabir seed may start with types off).
- OFF stops that type immediately.
- F5 has no toggle.
- Price Drop toggle may remain in chrome so 18–24 can keep it off; **this MVP does not send F2**.

---

## 🗂️ Wishlist Screen — UI Structure

```
Wishlist
├── Header: title + count + ⚙️
├── Hint: same types sit together so you can compare
├── Tabs: All | Compare | Occasion | My size | How it looks on me | Saved | No longer available
├── All:
│   ├── Compare banners (one per cluster)
│   ├── Groups by save-reason + dead nudge
│   └── Cards: image, brand, name, price, tag chip, stock, MOVE TO BAG
└── Compare tab → cluster list → Compare page (cards)
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
| Restock other size | No F3 |
| Same occasion date, two SKUs | One F4 |
| OS notifications off | F5 still shows |
| Demo checkout | No live conversion % |

---

## ✅ Definition of Done

| Feature | Done when |
|---|---|
| F-CMP | Clusters at 2+, cap 5, cards with required fields, in-stock filter, Not this, bag, no TTS / fake score, no category mix, dead excluded |
| F1 | Four tags (no price-drop), skip, chip, edit, styling photos of this SKU |
| F3 | Exact saved size; F6 respected |
| F4 | Date required, ≤7 days, batched, filtered list |
| F5 | In-app top/tab, Similar + Remove, never push, not in compare |
| F6 | Toggles, ⚙️, no F5 push toggle |
| Honesty | No invented conversion % |

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
| Wishlist (tabs + banners) | Modified |
| Compare page | **New** |
| Tag sheet | Existing |
| Prefs (⚙️) | Existing |
| Dead nudge | Existing |
| PDP / Bag | Existing |

---

*Comparison MVP v2.0 | Aligns docs with the shopper prototype. Research still 6 interviews + 2 surveys.*
