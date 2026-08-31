# Myntra Wishlist MVP1 — Edge Cases

**Sources:** [ProblemStatement_Solution_MVP.md](./ProblemStatement_Solution_MVP.md), [Architecture_Wishlist_Reengagement_MVP.md](./Architecture_Wishlist_Reengagement_MVP.md), [Implementation_Wishlist_Reengagement_MVP.md](./Implementation_Wishlist_Reengagement_MVP.md)

Use this file as the QA catalog. Each case has a stable ID for tickets and tests.

**Supersedes:** discovery-engine catalog (EC-COR, EC-RAG, …) and the retired UGC-only shopper catalog. Those IDs are **retired** for this PRD (see §12). Do not reuse retired IDs for new meanings.

---

## 0. How to read

| Field | Meaning |
|-------|---------|
| **ID** | `EC-<area>-<nnn>` |
| **Sev** | **S1** wrong shopper action / policy miss · **S2** broken happy path · **S3** polish · **S0** legal / PII / “must never push” |
| **Phase** | P0–P6 from Implementation |
| **Expect** | Specified behavior |

**Triage:** S0/S1 before phase exit. S2 blocks that phase. S3 can follow.

| Prefix | Area |
|--------|------|
| `EC-TAG` | F1 context tag |
| `EC-PD` | F2 price drop |
| `EC-STK` | F3 restock |
| `EC-OCC` | F4 occasion |
| `EC-DEAD` | F5 dead item |
| `EC-PREF` | F6 prefs + OS mute |
| `EC-EMP` | Empty / honest metrics |
| `EC-SEC` | PII / prefs storage |

---

## 1. Defaults (do not re-debate)

- Tags: `occasion` \| `price_drop` \| `size_wait` \| `bookmarking` \| `null`.
- Skip / 6s timeout → `null`, no re-prompt.
- F2: drop ≥ ₹50 **or** ≥ 5% (whichever is the smaller bar); 1 / item / 48h.
- F3: watch only if size OOS **at save**; exact size; no re-fire after purchase.
- F4: requires `occasionDate`; ≤7 days; batch same date; no ping after date passed.
- F5: in-app only; 60d OOS or discontinued; once per item.
- F6: three toggles, default ON; OFF is immediate.
- Wishlist→cart is **unavailable** in proto until a real cart join is on. Empty ≠ `0%` or `15%`.

---

## 2. PRD table (must pass)

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-TAG-001 | S1 | P1 | User skips context tag sheet | Save with `tag: null`. No re-prompt |
| EC-PD-001 | S2 | P3 | Price drops then rises | Notify on drop only. No “price rose” |
| EC-PREF-001 | S0 | P6 | OS notifications OFF | F5 in-app nudge still shows |
| EC-STK-001 | S1 | P4 | Added in stock, later OOS | No size watch. F5 after 60d if still OOS |
| EC-OCC-001 | S1 | P5 | Occasion date passes, no purchase | Tag auto-cleared. Item stays. No notification |
| EC-OCC-002 | S1 | P5 | Multiple items, same occasion | **One** batched notification |
| EC-PREF-002 | S0 | P3 | F2 toggle OFF, price drops | No notification |

---

## 3. F1 — Context tag

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-TAG-002 | S2 | P1 | Sheet slower than 300ms | Fail AC |
| EC-TAG-003 | S2 | P1 | Fourth tag requires scroll | Fail AC |
| EC-TAG-004 | S1 | P1 | Auto-dismiss at 6s mid-tap | If tap committed, persist tag; else null |
| EC-TAG-005 | S2 | P1 | Date picker shown for Price Drop tag | Forbidden |
| EC-TAG-006 | S2 | P1 | Occasion selected, date skipped | `tag: occasion`, `occasionDate: null` — F4 will not fire |
| EC-TAG-007 | S2 | P1 | Long-press edit to bookmarking | Chip updates; F4 cancelled if date cleared |
| EC-TAG-008 | S3 | P1 | Rapid double-add | One row (or two explicit rows); no duplicate sheets stacked |

---

## 4. F2 — Price drop

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-PD-002 | S1 | P3 | Drop ₹40 on a ₹2,000 item (2%) | No send (misses both ₹50 and 5%) |
| EC-PD-003 | S1 | P3 | Drop ₹40 on an ₹700 item (~5.7%) | Send (5% bar is smaller) |
| EC-PD-004 | S1 | P3 | Drop ₹60 on a ₹5,000 item (1.2%) | Send (₹50 bar is smaller) |
| EC-PD-005 | S1 | P3 | Second qualifying drop 12h later | No send (48h cap) |
| EC-PD-006 | S2 | P3 | Deep link | PDP of **that** item; Add to Cart highlighted |
| EC-PD-007 | S2 | P3 | Item purchased / removed | No send |
| EC-PD-008 | S3 | P3 | Price equals `priceAtSave` | No send |

---

## 5. F3 — Restock

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-STK-002 | S1 | P4 | Saved size M OOS; size L returns | No send |
| EC-STK-003 | S1 | P4 | Saved size M returns | One send; PDP pre-selects M |
| EC-STK-004 | S1 | P4 | User already purchased | No re-fire |
| EC-STK-005 | S2 | P4 | F6 size toggle OFF | No send |
| EC-STK-006 | S2 | P4 | Same restock event delivered twice | Idempotent; one notification |
| EC-STK-007 | S3 | P4 | Units-left unknown | Body without “Only X left” |

---

## 6. F4 — Occasion

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-OCC-003 | S1 | P5 | Occasion tag, no date | No F4 |
| EC-OCC-004 | S1 | P5 | 8 days before date | No send yet |
| EC-OCC-005 | S2 | P5 | 7 days before | Send (inclusive ≤7) |
| EC-OCC-006 | S1 | P5 | All occasion items already purchased | No send |
| EC-OCC-007 | S2 | P5 | Tap notification | Wishlist **filtered** to those items |
| EC-OCC-008 | S2 | P5 | F6 occasion OFF | No send |
| EC-OCC-009 | S3 | P5 | Two occasions, two dates | Two notifications (one per date), not merged |

---

## 7. F5 — Dead item

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-DEAD-001 | S0 | P6 | Worker flags dead item | **No** push / inbox row |
| EC-DEAD-002 | S1 | P6 | OOS 59 days, not discontinued | No nudge |
| EC-DEAD-003 | S1 | P6 | OOS 60 days or discontinued | Card at **top** |
| EC-DEAD-004 | S2 | P6 | See Similar | Category search with matching filters |
| EC-DEAD-005 | S2 | P6 | Remove | Item gone immediately |
| EC-DEAD-006 | S1 | P6 | Dismissed once | No repeat for that item |
| EC-DEAD-007 | S2 | P6 | Card buried mid-list | Fail AC |

---

## 8. F6 — Prefs

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-PREF-003 | S2 | P2 | Fresh user | All three ON |
| EC-PREF-004 | S1 | P2 | Toggle OFF then ON | Subsequent events may send again (subject to 48h / once-per-restock) |
| EC-PREF-005 | S0 | P2 | Prefs on second device | Profile-persisted; same toggles |
| EC-PREF-006 | S2 | P2 | ⚙️ missing on wishlist | Fail AC |
| EC-PREF-007 | S3 | P2 | F5 has a push toggle | Forbidden |

---

## 9. Empty states and honesty

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-EMP-001 | S0 | P0 | No real cart join | Do not show ~15% or 0% as live conversion |
| EC-EMP-002 | S2 | P0 | Empty wishlist | Empty state, not a fake nudge |
| EC-EMP-003 | S2 | P6 | No dead items | No warning chrome |

---

## 10. Security

| ID | Sev | Phase | Scenario | Expect |
|----|-----|-------|----------|--------|
| EC-SEC-001 | S0 | P2 | Prefs | User id + toggles only; no extra PII |
| EC-SEC-002 | S0 | P3 | Push body | Item name + prices; no payment or address |

---

## 11. Phase exit — blocking IDs

| Phase | Blocking (S0–S2) |
|-------|------------------|
| P0 | EC-EMP-001 |
| P1 | EC-TAG-001, EC-TAG-002, EC-TAG-003, EC-TAG-005 |
| P2 | EC-PREF-003, EC-PREF-005, EC-PREF-006 |
| P3 | EC-PREF-002, EC-PD-001–006 |
| P4 | EC-STK-001–005 |
| P5 | EC-OCC-001–003, EC-OCC-006–007 |
| P6 | EC-PREF-001, EC-DEAD-001–006 |

---

## 12. Retired IDs

Do not attach these to MVP1 tickets:

- Discovery engine: `EC-COR-*`, `EC-TAX-*`, `EC-ATR-*`, `EC-CMP-*`, `EC-RAG-*`, `EC-CNF-*`, `EC-AN-*` (stakeholder insight), `EC-FLG-*` (`discover.*`).
- Previous shopper one-shot UGC catalog where it **conflicts** with this PRD (e.g. “bookmark never pinged” as a global rule — F2 can fire without a tag; bookmarking tag does not by itself block F2 unless product later gates it).

When the PRD changes thresholds, 60-day window, or toggle set, update **§1**, the affected rows, and §11 in the same change.

---

## 13. Document control

| Version | Notes |
|---------|--------|
| 1.0 | Shopper re-engagement (retired) |
| 2.0 | Discovery engine (retired for this PRD) |
| 3.0 | Wishlist MVP1: F1–F6, PRD edge table + expansions |
