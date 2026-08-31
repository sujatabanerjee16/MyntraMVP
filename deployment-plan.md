# Deployment plan — Myntra wishlist MVP

**Repo:** [https://github.com/sujatabanerjee16/MyntraMVP](https://github.com/sujatabanerjee16/MyntraMVP)  
**Target:** frontend on **Vercel**, backend on **Render**  
**Source of truth for product behaviour:** `Doc/Architecture_Wishlist_Reengagement_MVP.md`, `Doc/Implementation_Wishlist_Reengagement_MVP.md`

This document is the split-and-host plan. It does not invent live wishlist→cart rates. Proto checkout stays demo-only (`shop.internal_orders` remains off).

---

## 1. What we have today

The repo is a **Vite + React + TypeScript SPA**. There is **no HTTP server**.

| Surface | Entry | Code |
|---------|--------|------|
| Shopper (primary) | `index.html`, `shopper.html` | `src/shopper/` |
| Discover dashboard (parked) | `discover.html` | `src/discover/` |
| Retired shopper chrome | — | `src/ui/` |

Shopper “APIs” are in-process functions (`createShopperApi` in `src/shopper/api.ts`) over an in-memory `ShopperStore`. Personas, catalog, wishlist, bag, inbox, and demo pushes (price drop / restock / occasion) all live in the browser process. A refresh or new tab is a new store.

**Implication:** Vercel can host the UI as static files today. Render has nothing to run until we extract an HTTP API.

---

## 2. Target topology

```
Browser
  │
  ├─ Vercel  (static Vite build)
  │     shopper UI  /  optional discover UI
  │     public/shopper/* images
  │
  └─ HTTPS  VITE_API_BASE_URL
        │
        ▼
     Render Web Service  (Node)
        createShopperApi + ShopperStore
        REST JSON
        │
        ├─ GET/POST wishlist, catalog, bag, prefs, inbox, stylist
        └─ Render Cron  (same service URL)
              POST /jobs/price-check     (every 6h)   F2
              POST /jobs/restock-check   (every 6h)   F3
              POST /jobs/occasion-check  (daily 09:00 IST)  F4
```

F5 (dead item) stays in-app: the backend flags it; the UI shows the nudge. No push.

FCM/APNs are **out of this deploy**. Inbox + lock-screen chrome in the prototype remain the demo of “push.”

---

## 3. Split the codebase (required before deploy)

Keep one GitHub repo. Add a small Node HTTP layer; point the React app at it.

### 3.1 Backend (`server/` or `src/shopper/http/`)

Wrap existing `createShopperApi(store, now)` — do not rewrite domain rules.

Suggested stack (fits the current ESM TypeScript repo):

- **Node 20+**
- **Express** or **Hono** (either is fine; pick one and stay)
- `tsx` or compiled `tsc` for start command
- CORS allowlist = Vercel origin(s)

Process model for the MVP:

- One Node process, **one in-memory `ShopperStore`**
- Seed on boot (current seed in `src/shopper/store.ts`)
- `POST /demo/reset` and `POST /demo/persona/:id` for the stage bar
- Demo clock can stay fixed at `2026-08-30T10:00:00+05:30` unless a job advances it

**Persistence:** Render free/web instances lose RAM on sleep/restart. That is acceptable for this prototype if we re-seed on boot. A later step (Postgres / Redis) is optional and not required to go live.

### 3.2 Frontend

- Leave Vite + React as the Vercel app
- Replace `runtime.api.*` in-process calls with `fetch(`${import.meta.env.VITE_API_BASE_URL}/...`)`
- Keep `unwrap` / `ApiResult` shape (`ok`, `status`, `body` / `error`) so UI tests can mock HTTP later
- Static images stay in `public/shopper/` (Vercel CDN)

Do not ship `src/discover/` on the same production hostname unless you want it — default **shopper only** (`index.html`). Discover can be a second Vercel route or stay unpublished.

### 3.3 HTTP map (shopper)

Mirror `createShopperApi`. All JSON. `user` from header `X-Persona-Id` or cookie for the demo (Sujata / Kabir).

| Method | Path | Today’s function |
|--------|------|------------------|
| GET | `/wishlist` | `getWishlist` |
| GET | `/wishlist?filter=occasion` | `getWishlist("occasion")` |
| POST | `/wishlist` | `addItem` |
| PATCH | `/wishlist/:id/tag` | `updateTag` |
| DELETE | `/wishlist/:id` | `removeItem` |
| POST | `/wishlist/:id/dismiss-dead` | `dismissDead` |
| GET | `/catalog` | `getCatalog` |
| GET | `/catalog/search?q=` | `searchCatalog` |
| GET | `/catalog/similar/:itemId` | `getSimilar` |
| GET | `/wishlist/:id/looks` | `getLookPairs` |
| GET | `/stylist` | `getStylistRecs` |
| GET | `/prefs` | `getPreferences` |
| PATCH | `/prefs` | `setPreferences` |
| GET | `/inbox` | `getInbox` |
| POST | `/inbox/:id/open` | `openNotification` |
| POST | `/bag` | `addToBag` |
| GET | `/bag` | `getBag` |
| GET | `/bag/recs` | `getOrderRecs` |
| POST | `/bag/addons` | `addOrderAddon` |
| POST | `/checkout` | `checkoutSuccess` |
| GET | `/measurement` | `getMeasurement` (returns not-in-prototype) |
| POST | `/demo/price-drop` | `dropPrice` |
| POST | `/demo/restock` | `restockSize` |
| POST | `/demo/restock-wrong` | `restockBibaWrongSize` |
| POST | `/demo/occasion` | `runOccasionCheck` |
| POST | `/jobs/price-check` | `runPriceCheck` |
| POST | `/jobs/restock-check` | restock scan (same rules as F3) |
| POST | `/jobs/occasion-check` | `runOccasionCheck` |
| GET | `/health` | `{ ok: true }` |

Protect `/jobs/*` and `/demo/*` with `CRON_SECRET` / `DEMO_SECRET` headers so random traffic cannot fire pushes.

---

## 4. Backend on Render

### 4.1 Service

| Setting | Value |
|---------|--------|
| Type | **Web Service** |
| Repo | `sujatabanerjee16/MyntraMVP` |
| Branch | `main` |
| Runtime | Node |
| Build | `npm install && npm run build:server` (add this script) |
| Start | `npm run start:server` (e.g. `node dist/server/index.js` or `npx tsx server/index.ts`) |
| Instance | Free is enough for demo; expect **spin-down after idle** |
| Health | `GET /health` |

Root directory: repo root (unless you later extract `server/` as its own package).

### 4.2 Environment (Render)

| Variable | Purpose |
|----------|---------|
| `PORT` | Render sets this. Bind `process.env.PORT` |
| `CORS_ORIGINS` | `https://<vercel-app>.vercel.app` (and preview URLs if needed) |
| `CRON_SECRET` | Shared secret for cron + optional demo |
| `NODE_ENV` | `production` |

No database URL for MVP in-memory.

### 4.3 Cron (Render Cron Jobs)

Architecture: price and restock every **6 hours**; occasion **daily 09:00 IST** (`03:30 UTC`).

Each cron is an HTTP job:

```http
POST https://<render-service>.onrender.com/jobs/price-check
Authorization: Bearer $CRON_SECRET
```

Same for `/jobs/restock-check` and `/jobs/occasion-check`.

If the web service is asleep, the first cron call wakes it (cold start ~30–60s). That is acceptable for demo.

### 4.4 CORS and cookies

- Allow `GET, POST, PATCH, DELETE, OPTIONS`
- Allow header `X-Persona-Id`
- If you use cookies later: `credentials: true` and an exact Vercel origin (not `*`)

---

## 5. Frontend on Vercel

### 5.1 Project

| Setting | Value |
|---------|--------|
| Repo | `sujatabanerjee16/MyntraMVP` |
| Framework | Vite |
| Root | repository root |
| Build | `npm run build` |
| Output | `dist` |
| Install | `npm install` |

Vite already builds `index.html` (shopper). Keep that as `/`.

Optional `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }]
}
```

Only add SPA fallback if you introduce client-side routes. Today the shopper is a single page with in-app screens, so a static `index.html` is enough.

### 5.2 Environment (Vercel)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | `https://<render-service>.onrender.com` (no trailing slash) |

Set it for **Production**. For Preview deployments, either:

- point at the same Render service, or
- add the `*.vercel.app` preview origin to `CORS_ORIGINS` on Render

Vite inlines `VITE_*` at **build** time. Changing the API URL requires a Vercel rebuild.

### 5.3 Assets

`public/shopper/*.jpg|png` copy into `dist` as `/shopper/...`. No extra CDN.

Google fonts stay loaded from `fonts.googleapis.com` (already in `index.html`).

---

## 6. GitHub → deploy wiring

1. Push stays on `main` ([github.com/sujatabanerjee16/MyntraMVP](https://github.com/sujatabanerjee16/MyntraMVP)).
2. **Vercel:** Import the GitHub repo, enable auto-deploy on `main`.
3. **Render:** Connect the same repo, auto-deploy on `main`.
4. Order of first go-live: **Render first** (need a public API URL), then set `VITE_API_BASE_URL` on Vercel and deploy the frontend.
5. After the Vercel URL exists, add it to Render `CORS_ORIGINS` and restart the web service.

Do not commit secrets. `CRON_SECRET` lives only in Render (and Vercel only if the UI must call `/demo/*`; prefer keeping demo buttons hitting Render with a short-lived header only in local/dev).

---

## 7. npm scripts to add (when implementing)

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx watch server/index.ts",
    "build": "tsc --noEmit && vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "start:server": "node dist/server/index.js",
    "test": "vitest run"
  }
}
```

Local full stack: Vite `5173` + server `8787`, `VITE_API_BASE_URL=http://localhost:8787`.

---

## 8. Rollout checklist

### Pre-split

- [ ] HTTP wrapper around `createShopperApi` with `/health`
- [ ] Frontend uses `VITE_API_BASE_URL`; no direct `ShopperStore` in UI
- [ ] CORS + `CRON_SECRET` on job routes
- [ ] `npm run build` and `npm test` green

### Render

- [ ] Web Service from `main`, start binds `PORT`
- [ ] `GET /health` returns 200
- [ ] Three Cron Jobs registered (price, restock, occasion)
- [ ] Idle spin-down understood (demo reset after sleep)

### Vercel

- [ ] Project linked to GitHub
- [ ] `VITE_API_BASE_URL` set to Render URL
- [ ] Production deploy of shopper
- [ ] Images load from `/shopper/...`
- [ ] Wishlist, bag, alerts, demo reset still work against Render

### Cross-origin smoke (after both are up)

- [ ] Open Vercel URL → shopper laptop view
- [ ] Add to wishlist + reason click (not hover)
- [ ] Add to bag from New arrivals
- [ ] Alerts tray → demo “Drop Libas price” → inbox/lock-screen path
- [ ] `Reset demo` re-seeds **on the server** (all tabs share that memory until sleep)

---

## 9. Operational limits (demo)

| Topic | Plan |
|-------|------|
| Store | In-memory; re-seed on process start |
| Render free sleep | First request after idle is slow; cron wakes it |
| Multi-instance | Do **not** scale to 2+ instances while the store is RAM-only |
| Real push (FCM/APNs) | Not in this deploy |
| Discover app | Optional second Vercel path; default off |
| Conversion % | Do not display fake wishlist→cart rates |

---

## 10. Later (not blocking this deploy)

- Persist `ShopperStore` to Render Postgres or Redis
- Real user auth instead of persona switcher
- FCM/APNs for F2–F4
- Custom domains (`shop.example.com` + `api.example.com`)
- Preview-environment Render instance so Vercel PRs do not share demo RAM

---

## 11. Suggested implementation order

1. Add `server/` HTTP API + `/health`; keep UI on in-process API behind a flag.
2. Switch shopper UI to `fetch` + `VITE_API_BASE_URL`.
3. Deploy API to Render; confirm `/health` and one `GET /wishlist`.
4. Deploy UI to Vercel with that base URL; fix CORS.
5. Attach Render crons.
6. Run the smoke checklist in §8.
