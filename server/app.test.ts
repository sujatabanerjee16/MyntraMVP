import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createServer } from "./app";

describe("shopper http api", () => {
  let server: Server | undefined;

  afterEach(async () => {
    const current = server;
    server = undefined;
    if (!current) return;
    await new Promise<void>((resolve, reject) => {
      current.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function listen() {
    const app = createServer();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server?.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    return `http://127.0.0.1:${addr.port}`;
  }

  it("GET / returns service info", async () => {
    const origin = await listen();
    const res = await fetch(`${origin}/`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; service: string };
    expect(json.ok).toBe(true);
    expect(json.service).toBe("myntra-wishlist-api");
  });

  it("GET /health returns ok", async () => {
    const origin = await listen();
    const res = await fetch(`${origin}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("GET /wishlist returns seeded items", async () => {
    const origin = await listen();
    const res = await fetch(`${origin}/wishlist`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; body: { items: unknown[] } };
    expect(json.ok).toBe(true);
    expect(json.body.items.length).toBeGreaterThan(0);
  });
});
