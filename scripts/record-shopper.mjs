import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public");
const outFile = join(outDir, "shopper-experience.webm");
const tmpDir = join(outDir, ".record-tmp");
const url = process.env.SHOPPER_URL ?? "http://127.0.0.1:5175/";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickHuman(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(280);
  const box = await locator.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 24), { steps: 16 });
    await sleep(350);
  }
  await locator.click();
}

async function showCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById("rec-cursor")) return;
    const el = document.createElement("div");
    el.id = "rec-cursor";
    el.style.cssText =
      "position:fixed;z-index:2147483647;width:18px;height:18px;border:2px solid #ff3f6c;border-radius:50%;background:rgba(255,63,108,.35);pointer-events:none;transform:translate(-50%,-50%);top:0;left:0;transition:width .12s,height .12s";
    document.body.appendChild(el);
    window.addEventListener(
      "mousemove",
      (event) => {
        el.style.left = `${event.clientX}px`;
        el.style.top = `${event.clientY}px`;
      },
      true,
    );
    window.addEventListener(
      "mousedown",
      () => {
        el.style.width = "12px";
        el.style.height = "12px";
      },
      true,
    );
    window.addEventListener(
      "mouseup",
      () => {
        el.style.width = "18px";
        el.style.height = "18px";
      },
      true,
    );
  });
}

async function setCaption(page, title, detail) {
  await page.evaluate(
    ({ title, detail }) => {
      let bar = document.getElementById("rec-caption");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "rec-caption";
        bar.style.cssText =
          "position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:2147483646;width:min(720px,calc(100% - 32px));background:rgba(17,24,39,.94);color:#fff;border-radius:12px;padding:10px 16px;font-family:Assistant,Segoe UI,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.28);pointer-events:none;text-align:left";
        document.body.appendChild(bar);
      }
      bar.innerHTML = `<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#ff8aa8;margin-bottom:2px">${title}</div><div style="font-size:16px;font-weight:700;line-height:1.3">${detail}</div>`;
    },
    { title, detail },
  );
}

const browser = await chromium.launch({
  headless: true,
  slowMo: 180,
});
await mkdir(tmpDir, { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: { dir: tmpDir, size: { width: 1280, height: 720 } },
});
context.setDefaultTimeout(25_000);
const page = await context.newPage();
const by = page.getByRole.bind(page);
let failed = null;
const started = Date.now();
const chapters = [];
function mark(step, line) {
  const t = Number(((Date.now() - started) / 1000).toFixed(1));
  chapters.push({ t, step, line });
  console.log(`CHAPTER\t${t}\t${step}`);
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator(".m-logo").waitFor();
  await showCursor(page);
  await setCaption(page, "Home", "Browsing Women — Men, Kids, Beauty, and GenZ sit in the bar.");
  mark("Home", "Browsing Women — Men, Kids, Beauty, and GenZ sit in the bar.");
  await sleep(1400);
  const cats = page.locator(".web-cats");
  await clickHuman(page, cats.getByRole("button", { name: "MEN", exact: true }));
  await page.getByText("Men · New arrivals").waitFor();
  await sleep(900);
  await clickHuman(page, cats.getByRole("button", { name: "WOMEN", exact: true }));
  await page.getByText("Women · New arrivals").waitFor();
  await sleep(700);

  await page.mouse.wheel(0, 480);
  await sleep(600);
  await page.mouse.wheel(0, 520);
  await sleep(700);

  const dressCard = page.locator(".trend-card-wrap", { hasText: "Floral Summer Dress" }).first();
  await dressCard.scrollIntoViewIfNeeded();
  await sleep(500);
  await setCaption(page, "Size chart", "Apparel listings have a size chart. Sarees and accessories skip it.");
  mark("Size chart", "Apparel listings have a size chart. Sarees and accessories skip it.");
  await clickHuman(page, dressCard.getByRole("button", { name: "Size chart" }));
  await by("heading", { name: "Size chart" }).waitFor();
  await sleep(1600);
  await clickHuman(page, by("button", { name: "Close" }));
  await sleep(400);

  await setCaption(page, "Save to wishlist", "Heart tap to save — not Add to Bag.");
  mark("Save to wishlist", "Heart tap to save — not Add to Bag.");
  await clickHuman(page, dressCard.getByRole("button", { name: "Save to wishlist" }));
  await by("heading", { name: "Saving this for…?" }).waitFor();
  await setCaption(
    page,
    "Why are you saving this?",
    "Four reasons at the heart tap: Check quality first, Check the fit, Compare, or Upcoming Occasion. Skip is allowed.",
  );
  mark(
    "Why are you saving this?",
    "Four reasons at the heart tap: Check quality first, Check the fit, Compare, or Upcoming Occasion. Skip is allowed.",
  );
  await sleep(1800);
  await setCaption(page, "Compare", "Choosing Compare — same-type saves sit side by side later.");
  mark("Compare", "Choosing Compare — same-type saves sit side by side later.");
  await clickHuman(page, by("button", { name: /pick the one that fits you/ }));
  await sleep(1000);

  await setCaption(page, "View in wishlist", "After the heart, a button takes you to that save.");
  mark("View in wishlist", "After the heart, a button takes you to that save.");
  await clickHuman(page, dressCard.getByRole("button", { name: "View in wishlist" }));
  await by("heading", { name: "Wishlist" }).waitFor();
  await sleep(900);

  await setCaption(
    page,
    "Wishlist tabs",
    "All · Compare · Quality & trust · My size · Occasion · No longer available — filtered by Women.",
  );
  mark(
    "Wishlist tabs",
    "All · Compare · Quality & trust · My size · Occasion · No longer available — filtered by Women.",
  );
  await clickHuman(page, by("tab", { name: /Quality & trust/ }));
  await sleep(1400);
  await setCaption(page, "Quality & trust", "Fabric, stars, 150+ reviews, quality/colour/texture quotes, and Real customer photos.");
  mark("Quality & trust", "Fabric, stars, 150+ reviews, quality/colour/texture quotes, and Real customer photos.");
  await sleep(1600);
  await clickHuman(page, by("tab", { name: /My size/ }));
  await setCaption(page, "My size", "Fit from past buys — a sentence, not a stock watch.");
  mark("My size", "Fit from past buys — a sentence, not a stock watch.");
  await sleep(1600);
  await clickHuman(page, by("tab", { name: /^Occasion/ }));
  await setCaption(page, "Occasion", "When will you wear it — named occasion, optional date, countdown.");
  mark("Occasion", "When will you wear it — named occasion, optional date, countdown.");
  await sleep(1400);
  await clickHuman(page, by("tab", { name: /Compare/ }));
  await sleep(900);
  await clickHuman(page, by("tab", { name: /No longer available/ }));
  await page.getByText("Zari Border Silk Saree").waitFor();
  await sleep(1100);
  await clickHuman(page, by("tab", { name: /^All/ }));
  await sleep(800);

  await setCaption(page, "Compare dresses", "Same-type dresses: price, stars, ratings, a quality note, Lowest here, and Buy this.");
  mark("Compare dresses", "Same-type dresses: price, stars, ratings, a quality note, Lowest here, and Buy this.");
  await clickHuman(page, by("button", { name: /Compare \d+ dresses in Women/ }));
  await by("checkbox", { name: /In stock only/ }).waitFor();
  await sleep(1600);
  await clickHuman(page, by("checkbox", { name: /In stock only/ }));
  await sleep(1200);
  await clickHuman(page, by("button", { name: "Back" }));
  await by("heading", { name: "Wishlist" }).waitFor();
  await sleep(500);

  await setCaption(page, "Category filter", "MEN · WOMEN · KIDS · BEAUTY · GENZ — the list never mixes categories.");
  mark("Category filter", "MEN · WOMEN · KIDS · BEAUTY · GENZ — the list never mixes categories.");
  await clickHuman(page, cats.getByRole("button", { name: "MEN", exact: true }));
  await page.getByText(/Men ·/).waitFor();
  await sleep(1100);
  await clickHuman(page, cats.getByRole("button", { name: "WOMEN", exact: true }));
  await page.getByText(/Women ·/).waitFor();
  await sleep(700);

  await setCaption(page, "Shop as", "Three shoppers on home — Sujata, Priya, Kabir.");
  mark("Shop as", "Three shoppers on home — Sujata, Priya, Kabir.");
  await clickHuman(page, by("button", { name: "MYNTRA" }));
  await page.getByRole("listbox", { name: "Shoppers" }).waitFor();
  await page.getByRole("option", { name: /Priya/ }).waitFor();
  await page.getByRole("option", { name: /Kabir/ }).waitFor();
  await sleep(1600);

  await setCaption(page, "Bag", "Moving a saved dress to bag — you can add more than one; recs stay on this page.");
  mark("Bag", "Moving a saved dress to bag — you can add more than one; recs stay on this page.");
  await clickHuman(page, by("button", { name: "Wishlist", exact: true }));
  await by("heading", { name: "Wishlist" }).waitFor();
  await clickHuman(page, by("tab", { name: /Quality & trust/ }));
  const qualityCard = page.locator("article.quality-card").filter({ has: by("button", { name: "MOVE TO BAG" }) }).first();
  await qualityCard.waitFor();
  await clickHuman(page, qualityCard.getByRole("button", { name: "MOVE TO BAG" }));
  await by("heading", { name: "Shopping Bag" }).waitFor();
  await by("heading", { name: "Recommended for this purchase" }).waitFor();
  await sleep(1200);
  await clickHuman(page, by("button", { name: "Back" }));
  await by("heading", { name: "Wishlist" }).waitFor();
  await clickHuman(page, by("tab", { name: /^All/ }));
  const secondBag = page.locator("article.wishlist-card").filter({ has: by("button", { name: "MOVE TO BAG" }) }).first();
  if (await secondBag.count()) {
    await setCaption(page, "Multi-item bag", "Second MOVE TO BAG keeps the first — bag holds more than one line.");
    mark("Multi-item bag", "Second MOVE TO BAG keeps the first — bag holds more than one line.");
    await clickHuman(page, secondBag.getByRole("button", { name: "MOVE TO BAG" }));
    await by("heading", { name: "Shopping Bag" }).waitFor();
    await sleep(1400);
  } else {
    await clickHuman(page, by("button", { name: "Bag" }));
    await by("heading", { name: "Shopping Bag" }).waitFor();
    await sleep(900);
  }
  await setCaption(page, "Checkout", "Place order opens address and UPI or COD — then Pay.");
  mark("Checkout", "Place order opens address and UPI or COD — then Pay.");
  await clickHuman(page, by("button", { name: "Place order" }));
  await by("heading", { name: "Checkout" }).waitFor();
  await page.getByText("Sujata Banerjee").waitFor();
  await sleep(1200);
  await clickHuman(page, by("radio", { name: "Cash on Delivery" }));
  await sleep(700);
  await setCaption(page, "Order", "Pay completes the order.");
  mark("Order", "Pay completes the order.");
  await clickHuman(page, by("button", { name: /^PAY ₹/ }));
  await page.getByText("Order successful").waitFor();
  await sleep(2200);
} catch (err) {
  failed = err;
  console.error(err);
  await page.screenshot({ path: join(outDir, "shopper-experience-fail.png"), fullPage: true }).catch(() => {});
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  const files = await readdir(tmpDir).catch(() => []);
  const webm = files.find((name) => name.endsWith(".webm"));
  if (webm) {
    await copyFile(join(tmpDir, webm), outFile);
    await rm(tmpDir, { recursive: true, force: true });
    console.log(`Saved ${outFile}`);
  } else {
    console.error("No webm was written.");
  }
  if (chapters.length) {
    await writeFile(join(outDir, "shopper-chapters.json"), `${JSON.stringify(chapters, null, 2)}\n`);
    console.log(`CHAPTERS ${JSON.stringify(chapters)}`);
  }
}

if (failed) process.exit(1);
