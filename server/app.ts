import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createShopperApi, type ApiResult } from "../src/shopper/api";
import { BIBA_SKU, LIBAS_SKU } from "../src/shopper/domain/models";
import { armBibaSizeWatch, ensureSeedItem, ShopperStore } from "../src/shopper/store";

const DEMO_CLOCK = "2026-08-30T10:00:00+05:30";

export function createServer() {
  const store = new ShopperStore();
  let clock = new Date(DEMO_CLOCK);
  const now = () => new Date(clock);
  const api = createShopperApi(store, now);

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: corsOrigins(),
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Persona-Id", "X-Cron-Secret", "X-Demo-Secret"],
    }),
  );

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "myntra-wishlist-api",
      health: "/health",
      wishlist: "/wishlist",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/session", (_req, res) => {
    send(res, { ok: true, status: 200, body: { personaId: store.personaId } });
  });

  app.get("/wishlist", (req, res) => {
    const filter = req.query.filter === "occasion" ? "occasion" : undefined;
    send(res, api.getWishlist(filter));
  });

  app.post("/wishlist", (req, res) => {
    const { product, tag, occasionDate } = req.body ?? {};
    if (!product) {
      send(res, { ok: false, status: 400, error: "Missing product" });
      return;
    }
    send(res, api.addItem(product, tag ?? null, occasionDate ?? null));
  });

  app.patch("/wishlist/:id/tag", (req, res) => {
    send(res, api.updateTag(param(req.params.id), req.body?.tag ?? null, req.body?.occasionDate ?? null));
  });

  app.delete("/wishlist/:id", (req, res) => {
    send(res, api.removeItem(param(req.params.id)));
  });

  app.post("/wishlist/:id/dismiss-dead", (req, res) => {
    send(res, api.dismissDead(param(req.params.id)));
  });

  app.get("/wishlist/:id/looks", (req, res) => {
    send(res, api.getLookPairs(param(req.params.id)));
  });

  app.get("/catalog/search", (req, res) => {
    send(res, api.searchCatalog(String(req.query.q ?? "")));
  });

  app.get("/catalog/similar/:itemId", (req, res) => {
    send(res, api.getSimilar(param(req.params.itemId)));
  });

  app.get("/catalog", (_req, res) => {
    send(res, api.getCatalog());
  });

  app.get("/stylist", (req, res) => {
    const limit = Number(req.query.limit ?? 5);
    send(res, api.getStylistRecs(Number.isFinite(limit) ? limit : 5));
  });

  app.get("/prefs", (_req, res) => {
    send(res, api.getPreferences());
  });

  app.patch("/prefs", (req, res) => {
    send(res, api.setPreferences(req.body ?? {}));
  });

  app.get("/inbox", (_req, res) => {
    send(res, api.getInbox());
  });

  app.post("/inbox/:id/open", (req, res) => {
    send(res, api.openNotification(param(req.params.id)));
  });

  app.post("/bag", (req, res) => {
    send(res, api.addToBag(req.body?.itemId));
  });

  app.get("/bag", (_req, res) => {
    send(res, api.getBag());
  });

  app.get("/bag/recs", (_req, res) => {
    send(res, api.getOrderRecs());
  });

  app.post("/bag/addons", (req, res) => {
    send(res, api.addOrderAddon(req.body?.sku));
  });

  app.post("/checkout", (_req, res) => {
    send(res, api.checkoutSuccess());
  });

  app.get("/measurement", (_req, res) => {
    send(res, api.getMeasurement());
  });

  app.post("/jobs/price-check", requireCron, (_req, res) => {
    send(res, api.runPriceCheck());
  });

  app.post("/jobs/restock-check", requireCron, (_req, res) => {
    send(res, { ok: true, status: 200, body: { sent: 0, reason: "none_due" } });
  });

  app.post("/jobs/occasion-check", requireCron, (_req, res) => {
    send(res, api.runOccasionCheck());
  });

  app.post("/demo/reset", requireDemo, (_req, res) => {
    store.reset("sujata");
    clock = new Date(DEMO_CLOCK);
    send(res, { ok: true, status: 200, body: { personaId: store.personaId } });
  });

  app.post("/demo/persona/:id", requireDemo, (req, res) => {
    store.reset(param(req.params.id));
    clock = new Date(DEMO_CLOCK);
    send(res, { ok: true, status: 200, body: { personaId: store.personaId } });
  });

  app.post("/demo/price-drop", requireDemo, (_req, res) => {
    ensureSeedItem(store, LIBAS_SKU);
    send(res, api.dropPrice(LIBAS_SKU, 2639));
  });

  app.post("/demo/restock", requireDemo, (_req, res) => {
    armBibaSizeWatch(store);
    const result = api.restockSize(BIBA_SKU, "S");
    if (result.ok && result.body.reason === "already_sent") {
      send(res, { ...result, body: { sent: 1, reason: "already_sent" } });
      return;
    }
    send(res, result);
  });

  app.post("/demo/restock-wrong", requireDemo, (_req, res) => {
    armBibaSizeWatch(store);
    send(res, api.restockSize(BIBA_SKU, "L"));
  });

  app.post("/demo/occasion", requireDemo, (_req, res) => {
    send(res, api.runOccasionCheck());
  });

  return app;
}

function param(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function corsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5175";
  if (raw.trim() === "*") return true;
  return raw.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function send<T>(res: Response, result: ApiResult<T>) {
  if (!result.ok) {
    res.status(result.status).json(result);
    return;
  }
  res.status(200).json(result);
}

function bearer(req: Request) {
  const header = req.headers.authorization ?? "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  const cron = req.headers["x-cron-secret"];
  const demo = req.headers["x-demo-secret"];
  if (typeof cron === "string") return cron;
  if (typeof demo === "string") return demo;
  return "";
}

function requireCron(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    next();
    return;
  }
  if (bearer(req) !== secret) {
    res.status(401).json({ ok: false, status: 401, error: "Unauthorized" });
    return;
  }
  next();
}

function requireDemo(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.DEMO_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    next();
    return;
  }
  if (bearer(req) !== secret) {
    res.status(401).json({ ok: false, status: 401, error: "Unauthorized" });
    return;
  }
  next();
}
