# 📦 PRD: Myntra Wishlist — MVP1
**Product:** Myntra Wishlist Feature — MVP1 Only  
**Version:** 1.0  
**Status:** Ready for Development  
**Platform:** Mobile App (iOS + Android)  
**Research Base:** 6 User Interviews + 2 Survey Datasets

---

## 🧭 North Star

> The wishlist today is a passive parking lot.  
> MVP1 turns it into an **active buying companion** — by telling users  
> *why* they saved something, and *when* it's time to act.

---

## 👥 User Segments

### Primary Segment — "Deliberate Planner" (Age 25–35)

| Attribute | Detail |
|---|---|
| Age | 25–35 |
| Shopping Style | Planned, occasion-driven |
| Wishlist Size | 2–50 items (intentional saves) |
| Revisit Frequency | Weekly |
| Why They Wishlist | Waiting for price drops, bank sale combo, upcoming occasions |
| Primary Trigger to Buy | Sale + bank offer OR occasion deadline |
| Pain with Wishlist | Saves items, forgets intent, no alert when price drops or size restocks |
| Representative Users | Ragamayi (289 items, weekly user), Snehi (10 items, occasion-driven), Touqeer (planned, size-watcher) |

**Key verbatims:**
> *"No notifications when price drops, item is back to stock etc."* — Ragamayi  
> *"If my size comes in future I get notified, currently it is not there"* — Snehi  
> *"I've forgotten why I added it, there should be something that reminds me"* — Snehi  
> *"If something is out of stock and they don't intend to restock, wishlist should notify and remove it"* — Ragamayi  

---

### Secondary Segment — "Impulsive Saver" (Age 18–24)

| Attribute | Detail |
|---|---|
| Age | 18–24 |
| Shopping Style | Impulsive, scroll-driven |
| Wishlist Size | 100–288 items (saves freely, acts rarely) |
| Revisit Frequency | Rarely |
| Why They Wishlist | Impulse saves while scrolling, "will look later" |
| Primary Trigger to Buy | Need-based, not notification-driven |
| Pain with Wishlist | Notification overload → app avoidance |
| ⚠️ Key Constraint | "Myntra should stop sending notifications — I get demotivated opening the app if I get 1000s of notifications" |
| Representative Users | Candidate 1 (288 items, rarely revisits) |

> **Design implication:** Notifications must be **user-controlled**. This segment needs opt-in granularity, not blast alerts.

---

## 🔴 Pain Points MVP1 is Solving

> Only P0 pain points. No P1/P2 in this build.

| ID | Pain Point | Who Feels It | Evidence |
|---|---|---|---|
| PP1 | No price drop alert on wishlisted items | 25–35 primarily | Ragamayi verbatim; confirmed by both survey groups |
| PP2 | No notification when OOS item / saved size is restocked | 25–35 primarily | Snehi verbatim; Touqeer lost a purchase to a competitor because of this |
| PP3 | No memory of why an item was saved | Both segments | Snehi: *"wishlist is a dead feature"*; 18–24 survey: forget saves quickly |
| PP4 | Dead/discontinued items stay in wishlist forever, no action nudge | 25–35 primarily | Ragamayi verbatim; items sit OOS for months with no signal |
| PP5 | Notification overload causing app avoidance | 18–24 segment | Candidate 1: notifications demotivate app opening |

---

## ✅ What MVP1 Builds (Scope)

| Feature | Pain Point Solved | Priority |
|---|---|---|
| F1: Context Tag on Save | PP3 | P0 |
| F2: Price Drop Push Notification | PP1 | P0 |
| F3: Size / Restock Push Notification | PP2 | P0 |
| F4: Occasion Reminder Notification | PP3 + buying trigger | P0 |
| F5: Dead Item In-App Nudge | PP4 | P0 |
| F6: Notification Preference Settings | PP5 | P0 (required guardrail) |

### ❌ OUT OF SCOPE — MVP1
- Side-by-side comparison of wishlist items → MVP2
- Duplicate detection banner → MVP2
- Wishlist folders / organisation → Post-MVP
- AI size/fit recommendations → Post-MVP
- Social wishlist sharing → Post-MVP

---

## 🏗️ Feature Specifications

---

### F1: Context Tag on Save
**Solves:** PP3 — Users forget why they saved an item

#### User Story
> As a user, when I add an item to my wishlist, I want to tag my intent  
> so that when I come back, I know exactly why it's there.

#### Flow
```
User taps "Add to Wishlist"
        ↓
Bottom sheet slides up (non-blocking):
  "Saving this for…?"
  [ 🎉 Upcoming Occasion ]
  [ 💸 Waiting for Price Drop ]
  [ 📦 Waiting for My Size ]
  [ 🤔 Just Bookmarking ]
        ↓
User taps a tag  →  Tag saved on wishlist card
User dismisses   →  Item saves with no tag (graceful skip)
```

#### UI Details
- Bottom sheet: 30% screen height, slides up in 250ms
- Auto-dismiss: 6 seconds if no interaction
- Tag displayed: Small coloured chip below item name on wishlist card
- Tag editable: Long press on wishlist card → edit tag option

#### Special: Occasion Date
- If user selects 🎉 Upcoming Occasion → secondary prompt appears:  
  *"When is the occasion?"* → Date picker (optional, skippable)
- Occasion date feeds into F4 (Occasion Reminder)

#### Data Model
```typescript
interface WishlistItem {
  id: string;
  productId: string;
  priceAtSave: number;
  selectedSize: string | null;
  tag: 'occasion' | 'price_drop' | 'size_wait' | 'bookmarking' | null;
  occasionDate: Date | null;
  savedAt: Date;
}
```

#### Acceptance Criteria
- [ ] Bottom sheet appears within 300ms of "Add to Wishlist" tap
- [ ] All 4 tags visible without scrolling
- [ ] Dismissing saves item with `tag: null` — no retry, no friction
- [ ] Tag chip visible on wishlist card
- [ ] Tag editable via long press
- [ ] Occasion date picker appears only when 🎉 is selected

---

### F2: Price Drop Push Notification
**Solves:** PP1

#### User Story
> As a user, I want to be notified automatically when the price drops  
> on anything in my wishlist, so I don't have to check manually.

#### Trigger Logic
- Condition: `current_price < price_at_save`
- Minimum threshold: price drop ≥ ₹50 OR ≥ 5% (whichever is smaller)
- Frequency cap: max 1 notification per item per 48 hours
- Respects user's notification preference toggle (F6)

#### Notification Copy
```
Title:  "Price Drop on your Wishlist 🎉"
Body:   "[Item Name] just dropped to ₹[new_price].
         (Was ₹[old_price]) — Sale may not last."
Action: Opens product page directly, "Add to Cart" CTA highlighted
```

#### Acceptance Criteria
- [ ] Notification fires only when drop meets ₹50 or 5% threshold
- [ ] Does NOT fire if user has toggled off Price Drop Alerts in F6
- [ ] Deep-links directly to the product page
- [ ] Max 1 alert per item per 48 hours enforced

---

### F3: Size / Restock Push Notification
**Solves:** PP2

#### User Story
> As a user, if I saved an item while my size was out of stock,  
> I want to know the moment it's back — before it sells out again.

#### Trigger Logic
- At save time: if `selectedSize` is OOS → register a **size watch**
- Trigger fires when: `size_watch.size` flips to `in_stock: true`
- One notification per restock event per user per item
- Respects F6 toggle

#### Notification Copy
```
Title:  "Your size is back! 📦"
Body:   "[Item Name] in size [M] is back in stock.
         Only [X] left — don't miss it."
Action: Opens product page with user's size pre-selected
```

#### Acceptance Criteria
- [ ] Size watch registered at time of save if selected size is OOS
- [ ] Notification fires only for the exact saved size, not other sizes
- [ ] Deep-links to product page with size pre-selected
- [ ] Does not re-fire if user already purchased the item

---

### F4: Occasion Reminder Notification
**Solves:** PP3 (buying trigger — occasion deadline)

#### User Story
> As a user, if I tagged wishlist items for an upcoming occasion  
> and set a date, I want a timely reminder so I order before it's too late.

#### Trigger Logic
- Fires when: `days_until_occasion_date <= 7`
- If multiple items tagged for the same occasion → batch into **1 notification**
- Does not fire if all occasion-tagged items are already purchased
- Respects F6 toggle

#### Notification Copy
```
Title:  "[Occasion] is in [X] days! 🎉"
Body:   "You have [N] items saved for it.
         Order now to get them on time."
Action: Opens wishlist filtered to show only occasion-tagged items
```

#### Acceptance Criteria
- [ ] Only fires if user set an occasion date (not just occasion tag)
- [ ] Multiple same-occasion items batched into 1 notification
- [ ] Deep-links to filtered wishlist showing occasion items only
- [ ] Does not fire if occasion date has already passed

---

### F5: Dead Item In-App Nudge
**Solves:** PP4 — Silent OOS items cluttering wishlist forever

#### User Story
> As a user, I want to know when a wishlisted item is never coming back,  
> so I can either find an alternative or clean up my wishlist.

#### Trigger Logic
- Condition A: Item has been `out_of_stock` for **60+ consecutive days**
- Condition B: Item is marked `discontinued` in Myntra's backend
- Delivery: **In-app card nudge only** — NOT a push notification
  *(Reason: 18–24 segment explicitly irritated by notifications — this keeps wishlist clean without adding to notification noise)*

#### UI — Nudge Card (appears at top of wishlist)
```
┌──────────────────────────────────────────────┐
│ ⚠️  This item won't be restocked              │
│ [thumbnail]  [Item Name]  [Brand]             │
│                                               │
│  [ See Similar Items ]    [ Remove  ✕ ]       │
└──────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Nudge card appears at top of wishlist (not buried)
- [ ] "See Similar" navigates to category search with matching filters
- [ ] "Remove" deletes item from wishlist immediately
- [ ] Nudge is shown only once per item (no repeat if dismissed)
- [ ] NOT sent as push notification

---

### F6: Notification Preference Settings *(Required Guardrail)*
**Solves:** PP5 — Notification overload causing app avoidance (18–24 segment)

#### User Story
> As a user, I want to choose which wishlist notifications I receive  
> so I'm not spammed and don't avoid the app.

#### Location
`Profile → Settings → Notifications → Wishlist Alerts`  
*Also accessible via ⚙️ icon on top-right of Wishlist screen*

#### UI
```
Wishlist Notifications
────────────────────────────────────────
💸 Price Drop Alerts          [ ON  ● ]
📦 Size Back-in-Stock         [ ON  ● ]
🎉 Occasion Reminders         [ ON  ● ]
```
> Note: Dead Item Nudge (F5) is in-app only — no toggle needed.

#### Behaviour
- All toggles default to **ON** for all users
- Toggling OFF immediately stops that notification type
- Preferences stored to **user profile** (not device-local)

#### Acceptance Criteria
- [ ] All toggles default to ON
- [ ] Toggling OFF stops that alert type immediately
- [ ] Preferences sync to user profile (persist across devices)
- [ ] ⚙️ shortcut visible on Wishlist screen header

---

## 🗂️ Wishlist Screen — Updated UI Structure

```
Wishlist Screen
├── Header
│   ├── Title: "Wishlist" + item count
│   └── ⚙️  Notification Settings  (top right)
│
├── Dead Item Nudge Cards  [if any — shown at top]
│   └── ⚠️  [Item] won't restock → [See Similar] [Remove]
│
├── Wishlist Items  (grid or list)
│   └── Item Card
│       ├── Product image
│       ├── Brand + Product name
│       ├── Price (current + strikethrough original)
│       ├── Context Tag chip  [🎉 Occasion / 💸 Price Drop / 📦 Size / 🤔 Bookmarking]
│       ├── Stock status  [In Stock / OOS]
│       └── [ Add to Cart ] CTA
```

---

## 📱 Screens to Build

| Screen / Component | Type | Priority |
|---|---|---|
| Wishlist Home (updated layout) | Modified existing screen | P0 |
| Context Tag Bottom Sheet | New component | P0 |
| Occasion Date Picker | New component (within tag flow) | P0 |
| Notification Preference Settings Screen | New screen | P0 |
| Dead Item Nudge Card | New component | P0 |

---

## 🔔 Notification Architecture

```
Push Notifications  (Firebase / APNs)
  ├── F2: Price Drop Alert
  ├── F3: Size Restock Alert
  └── F4: Occasion Reminder

In-App Only  (no push)
  └── F5: Dead Item Nudge Card
```

---

## ⚙️ API Endpoints Needed

```
// Wishlist
GET    /wishlist/:userId                    → Fetch all wishlist items
POST   /wishlist/:userId/items              → Add item (include tag + occasionDate)
PATCH  /wishlist/:userId/items/:itemId      → Update tag / occasion date
DELETE /wishlist/:userId/items/:itemId      → Remove item

// Notification Preferences
GET    /wishlist/:userId/preferences        → Fetch notification prefs
PATCH  /wishlist/:userId/preferences        → Update toggles

// Internal / Cron
POST   /notifications/wishlist/price-check  → Check price drops (runs every 6h)
POST   /notifications/wishlist/restock-check→ Check size restocks (runs every 6h)
POST   /notifications/wishlist/occasion-check → Check upcoming occasions (runs daily 9AM)
POST   /notifications/wishlist/dead-items   → Flag OOS 60+ days (runs daily)
```

---

## ⏱️ Background Jobs (Cron Schedule)

```
Every 6 hours:
  → Price drop check → fire F2 if threshold met
  → Restock check    → fire F3 if saved size back in stock

Daily at 9 AM:
  → Occasion check   → fire F4 if occasion ≤ 7 days away
  → Dead item check  → flag items OOS 60+ days → show F5 nudge
```

---

## ⚠️ Edge Cases to Handle

| Scenario | Expected Behaviour |
|---|---|
| User skips context tag bottom sheet | Item saves with `tag: null`. No re-prompt. |
| Price drops then rises again | Notification fires on drop only. No "price rose" alert. |
| User's phone notifications OFF at OS level | F5 in-app nudge still works as fallback |
| Item added while in stock — goes OOS later | No size watch registered. F5 dead item logic applies after 60 days. |
| Occasion date passes without purchase | Occasion tag auto-cleared. Item stays in wishlist. No notification. |
| Multiple items for same occasion | Batch into 1 notification — not separate pings per item |
| User has F2 toggle OFF but price drops | No notification sent. Preference respected. |

---

## ✅ Definition of Done — MVP1

| Feature | Done When |
|---|---|
| F1: Context Tag | Tag saves, shows on card, editable, graceful skip works |
| F2: Price Drop | Notification fires on threshold, respects toggle, deep-links correctly |
| F3: Restock | Fires for exact saved size only, pre-selects size on landing |
| F4: Occasion Reminder | Batches items, fires 7 days before, filters wishlist on tap |
| F5: Dead Item Nudge | In-app card at top of wishlist, See Similar + Remove both work |
| F6: Notification Settings | 3 toggles work, defaults ON, syncs to profile, accessible from wishlist |

---

## 📊 Success Metrics — MVP1

| Metric | Target |
|---|---|
| Wishlist → Cart conversion rate | Increase from ~5% baseline to ≥ 15% |
| Price Drop notification CTR | ≥ 25% |
| Restock notification CTR | ≥ 35% |
| Dead items removed/actioned | ≥ 40% of flagged items |
| Context Tag adoption | ≥ 50% of new wishlist saves tagged |
| Notification opt-out rate | ≤ 20% (health check for notification strategy) |

---

*MVP1 PRD v1.0 | Research: 6 interviews (18–24 + 25–35) + 2 surveys | Myntra Wishlist, 2024*