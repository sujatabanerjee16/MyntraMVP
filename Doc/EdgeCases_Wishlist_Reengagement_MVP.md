# Myntra Wishlist — Edge Cases (Comparison MVP)

**Sources:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md), [Architecture_Wishlist_Reengagement_MVP.md](./Architecture_Wishlist_Reengagement_MVP.md), [Implementation_Wishlist_Reengagement_MVP.md](./Implementation_Wishlist_Reengagement_MVP.md)

Use this file as the QA catalog. Each case has a stable ID for tickets and tests.

**Supersedes:** discovery-engine catalog (`EC-CMP-*` is **retired** — do not reuse those IDs). Compare cases use **`EC-COMP-*`**. Also supersedes “price-drop tag + push as P0” rows where they conflict with PRD v2.0.

---

## 0. How to read

| Field | Meaning |
|-------|---------|
| **ID** | `EC-<area>-<nnn>` |
| **Sev** | **S1** wrong shopper action / policy miss · **S2** broken happy path · **S3** polish · **S0** legal / PII / “must never push” / honesty |
| **Phase** | P0–P7 from Implementation |
| **Expect** | Specified behavior |

**Triage:** S0/S1 before phase exit. S2 blocks that phase. S3 can follow.

| Prefix | Area |
|--------|------|
| `EC-COMP` | F-CMP clusters + cards |
| `EC-TAG` | F1 context tag |
| `EC-PD` | Price drop (**no send** in this slice) |
| `EC-STK` | F3 restock |
| `EC-OCC` | F4 occasion |
| `EC-DEAD` | F5 dead item |
| `EC-PREF` | F6 prefs + OS mute |
| `EC-EMP` | Empty / honest metrics |
| `EC-SEC` | PII / prefs storage |

---

## 1. Defaults (do not re-debate)

- Tags offered: `occasion` \| `size_wait` \| `styling_unsure` \| `bookmarking` \| `null`. **No** price-drop choice.
- Skip → `null`, no re-prompt.
- Compare: same `SiteCat` + article; ≥2; cap 5 newest; discontinued excluded.
- F3: watch only if size OOS **at save**; exact size; no re-fire after purchase.
- F4: requires `occasionDate`; ≤7 days; batch same date; no ping after date passed.
- F5: in-app only; 60d OOS or discontinued; once per item; **not in compare**.
- F6: three toggles; OFF is immediate for F3/F4.
- F2: **do not send** a price-drop notification.
- Wishlist→cart is **unavailable** in proto. Empty ≠ `0%` or `15%`.
- Reviews: no “true to size”. Quality: no fake `8.4/10`.

---

## 2. Must-pass table

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-COMP-001 | S1 | P7 | Two+ Women kurtas live | Cluster `WOMEN:kurta`; compare cards |
| EC-COMP-002 | S1 | P7 | Discontinued kurta + live kurtas | Discontinued **not** in cluster (F5 only) |
| EC-COMP-003 | S1 | P7 | Women dress + Kids frock | **No** shared cluster |
| EC-TAG-001 | S1 | P1 | User skips context tag sheet | Save with `tag: null`. No re-prompt |
| EC-PD-001 | S0 | P3 | Price drops | **No** inbox / push row |
| EC-PREF-001 | S0 | P6 | OS notifications OFF | F5 in-app nudge still shows |
| EC-STK-001 | S1 | P4 | Added in stock, later OOS | No size watch. F5 after 60d if still OOS |
| EC-OCC-001 | S1 | P5 | Occasion date passes, no purchase | Tag auto-cleared. Item stays. No notification |
| EC-OCC-002 | S1 | P5 | Multiple items, same occasion | **One** batched notification |
| EC-PREF-002 | S0 | P4 | Size toggle OFF, size returns | No notification |

---

## 3. F-CMP — Compare

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-COMP-004 | S2 | P7 | Only one shirt | No `MEN:shirt` cluster |
| EC-COMP-005 | S1 | P7 | Six live kurtas | Cards capped at **5** newest |
| EC-COMP-006 | S1 | P7 | OOS size-watch in cluster | Shown unless **In stock only** |
| EC-COMP-007 | S2 | P7 | In stock only | Remaining cards all `inStock` |
| EC-COMP-008 | S2 | P7 | Not this until fewer than 2 left | Empty: need two pieces left |
| EC-COMP-009 | S1 | P7 | Review copy | No “true to size” |
| EC-COMP-010 | S1 | P7 | Quality line | No `\d / 10` score |
| EC-COMP-011 | S1 | P7 | On-body photo | This SKU (Libas UGC or product image) — not a different dress |
| EC-COMP-012 | S2 | P7 | MOVE TO BAG on in-stock card | Shopping Bag contains that SKU |
| EC-COMP-013 | S2 | P7 | OOS card | No bag CTA; watching / OOS label |
| EC-COMP-014 | S1 | P7 | Cheapest flag | Lowest **visible** price (after filter / Not this) |
| EC-COMP-015 | S2 | P7 | Sujata | Dresses **and** kurtas clusters when counts ≥2 |
| EC-COMP-016 | S2 | P7 | Kabir | Shirts cluster when ≥2 |
| EC-COMP-017 | S3 | P7 | Compare tab with no clusters | Empty copy: save two of the same type |
| EC-COMP-018 | S1 | P7 | GENZ hoodie vs KIDS hoodie | Separate keys; never one “hoodie” pile |
| EC-COMP-019 | S2 | P7 | HTTP `GET /wishlist/compare/WOMEN:kurta` | Not captured as `/wishlist/:id` |

---

## 4. F1 — Context tag

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-TAG-002 | S2 | P1 | “Waiting for Price Drop” on sheet | **Forbidden** |
| EC-TAG-003 | S2 | P1 | Fourth tag requires scroll | Fail AC |
| EC-TAG-004 | S1 | P1 | Skip mid-sheet | `tag: null` |
| EC-TAG-005 | S2 | P1 | Date picker for non-occasion tags | Forbidden |
| EC-TAG-006 | S2 | P1 | Occasion selected, date skipped | `tag: occasion`, `occasionDate: null` — F4 will not fire |
| EC-TAG-007 | S2 | P1 | Edit to bookmarking | Chip updates; F4 cancelled if date cleared |
| EC-TAG-008 | S3 | P1 | Rapid double-add | One row (or two explicit rows); no stacked sheets |
| EC-TAG-009 | S1 | P1 | `styling_unsure` | Photos of **this** SKU; reviews without TTS |

---

## 5. Price drop (no send)

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-PD-002 | S0 | P3 | Qualifying ₹ drop | `sent: 0`; no Price Drop inbox title |
| EC-PD-003 | S2 | P3 | Price drop tab on wishlist | **Forbidden** |
| EC-PD-004 | S3 | P3 | `currentPrice` updated in proto | Compare / card may show new ₹; still no ping |

Retired as *must-send* (do not revive in P7): old “notify at ₹50 or 5%” as a ship gate. If F2 returns later, write new IDs — do not silently reuse these as send tests.

---

## 6. F3 — Restock

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-STK-002 | S1 | P4 | Saved size M OOS; size L returns | No send |
| EC-STK-003 | S1 | P4 | Saved size M returns | One send; size pre-selected |
| EC-STK-004 | S1 | P4 | User already purchased | No re-fire |
| EC-STK-005 | S2 | P4 | F6 size toggle OFF | No send |
| EC-STK-006 | S2 | P4 | Same restock event twice | Idempotent; one notification |
| EC-STK-007 | S3 | P4 | Units-left unknown | Body without “Only X left” |

---

## 7. F4 — Occasion

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-OCC-003 | S1 | P5 | Occasion tag, no date | No F4 |
| EC-OCC-004 | S1 | P5 | 8 days before date | No send yet |
| EC-OCC-005 | S2 | P5 | 7 days before | Send (inclusive ≤7) |
| EC-OCC-006 | S1 | P5 | All occasion items already purchased | No send |
| EC-OCC-007 | S2 | P5 | Tap notification | Wishlist **filtered** to those items |
| EC-OCC-008 | S2 | P5 | F6 occasion OFF | No send |
| EC-OCC-009 | S3 | P5 | Two occasions, two dates | Two notifications (one per date) |

---

## 8. F5 — Dead item

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-DEAD-001 | S0 | P6 | Worker flags dead item | **No** push / inbox row |
| EC-DEAD-002 | S1 | P6 | OOS 59 days, not discontinued | No nudge |
| EC-DEAD-003 | S1 | P6 | OOS 60 days or discontinued | Visible under No longer available / top treatment |
| EC-DEAD-004 | S2 | P6 | See Similar | Same category / article — not Kids when source is Women |
| EC-DEAD-005 | S2 | P6 | Remove | Item gone immediately |
| EC-DEAD-006 | S1 | P6 | Dismissed once | No repeat for that item |
| EC-DEAD-007 | S1 | P7 | Dead row in compare cluster | **Fail** |

---

## 9. F6 — Prefs

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-PREF-003 | S2 | P2 | Fresh planner user | Toggles ON (Kabir seed may differ) |
| EC-PREF-004 | S1 | P2 | Toggle OFF then ON | Subsequent F3/F4 may send again (subject to caps) |
| EC-PREF-005 | S0 | P2 | Prefs on second device | Profile-persisted |
| EC-PREF-006 | S2 | P2 | ⚙️ missing on wishlist | Fail AC |
| EC-PREF-007 | S3 | P2 | F5 has a push toggle | Forbidden |

---

## 10. Empty states and honesty

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-EMP-001 | S0 | P0 | No real cart join | Do not show ~15% or 0% as live conversion |
| EC-EMP-002 | S2 | P0 | Empty wishlist | Empty state, not a fake nudge |
| EC-EMP-003 | S2 | P6 | No dead items | No warning chrome |
| EC-EMP-004 | S2 | P7 | No clusters | Compare empty copy — not a fake pair |

---

## 11. Security

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-SEC-001 | S0 | P2 | Prefs | User id + toggles only; no extra PII |
| EC-SEC-002 | S0 | P4 | Push body | Item name + size; no payment or address |

---

## 12. Phase exit — blocking IDs

| Phase | Blocking (S0–S2) |
|-------|------------------|
| P0 | EC-EMP-001 |
| P1 | EC-TAG-001, EC-TAG-002, EC-TAG-003 |
| P2 | EC-PREF-005, EC-PREF-006 |
| P3 | EC-PD-001, EC-PD-002, EC-PD-003 |
| P4 | EC-STK-001–005, EC-PREF-002 |
| P5 | EC-OCC-001–003, EC-OCC-006–007 |
| P6 | EC-PREF-001, EC-DEAD-001–006 |
| P7 | EC-COMP-001–003, EC-COMP-007–012, EC-COMP-015–016, EC-COMP-019, EC-DEAD-007, EC-EMP-004 |

---

## 13. Retired IDs

Do not attach these to tickets:

- Discovery engine: `EC-COR-*`, `EC-TAX-*`, `EC-ATR-*`, **`EC-CMP-*`**, `EC-RAG-*`, `EC-CNF-*`, `EC-AN-*`, `EC-FLG-*` (`discover.*`).
- Old “F2 must notify at threshold” as a P7 gate (replaced by EC-PD no-send).
- “Side-by-side compare is MVP2 / out of scope.”

When clustering rules, cap, or tag set change, update **§1**, the affected rows, and §12 in the same change.

---

## 14. Document control

| Version | Notes |
|---------|--------|
| 1.0 | Shopper re-engagement (retired) |
| 2.0 | Discovery engine (retired) |
| 3.0 | Wishlist F1–F6 with price-drop as P0 (superseded) |
| 4.0 | Comparison MVP: `EC-COMP-*`; no price-drop send; tags without price_drop |
