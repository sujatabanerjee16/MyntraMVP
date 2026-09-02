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
  await setCaption(page, "Home", "Browsing Myntra like a shopper — new arrivals on the page.");
  mark("Home", "Browsing Myntra like a shopper — new arrivals on the page.");
  await sleep(1600);

  await page.mouse.wheel(0, 480);
  await sleep(700);
  await page.mouse.wheel(0, 520);
  await sleep(800);

  const dressCard = page.locator(".trend-card-wrap", { hasText: "Floral Summer Dress" }).first();
  await dressCard.scrollIntoViewIfNeeded();
  await sleep(500);
  await setCaption(page, "Size chart", "Apparel listings have a size chart. Sarees and accessories skip it.");
  mark("Size chart", "Apparel listings have a size chart. Sarees and accessories skip it.");
  await clickHuman(page, dressCard.getByRole("button", { name: "Size chart" }));
  await by("heading", { name: "Size chart" }).waitFor();
  await sleep(1800);
  await clickHuman(page, by("button", { name: "Close" }));
  await sleep(500);

  await setCaption(page, "Save to wishlist", "Heart tap to save — not Add to Bag.");
  mark("Save to wishlist", "Heart tap to save — not Add to Bag.");
  await clickHuman(page, by("button", { name: "Save to wishlist" }).first());
  await by("heading", { name: "Saving this for…?" }).waitFor();
  await setCaption(
    page,
    "Why are you saving this?",
    "MVP asks at the heart tap: occasion, size, styling, or just bookmarking.",
  );
  mark("Why are you saving this?", "MVP asks at the heart tap: occasion, price, size, or just bookmarking.");
  await sleep(1200);
  await setCaption(page, "Upcoming Occasion", "Choosing Upcoming Occasion — this is for a date, not a folder.");
  mark("Upcoming Occasion", "Choosing Upcoming Occasion — this is for a date, not a folder.");
  await clickHuman(page, by("button", { name: /Upcoming Occasion/ }));
  await by("heading", { name: "When is the occasion?" }).waitFor();
  await setCaption(page, "Occasion date", "Setting when the occasion is, so a reminder can fire in time.");
  mark("Occasion date", "Setting when the occasion is, so a reminder can fire in time.");
  await sleep(900);
  await clickHuman(page, by("button", { name: "Save date" }));
  await sleep(1000);

  await setCaption(page, "View in wishlist", "After the heart, a button takes you to that save.");
  mark("View in wishlist", "After the heart, a button takes you to that save.");
  await clickHuman(page, by("button", { name: "View in wishlist" }).first());
  await by("heading", { name: "Wishlist" }).waitFor();
  await sleep(1000);

  await setCaption(page, "Wishlist tabs", "The list is tabbed by why you saved — Occasion, My size, Need styling, Saved.");
  mark("Wishlist tabs", "The list is tabbed by why you saved — Occasion, My size, Need styling, Saved.");
  await clickHuman(page, by("tab", { name: /Occasion/ }));
  await sleep(1100);
  await clickHuman(page, by("tab", { name: /No longer available/ }));
  await sleep(1100);
  await clickHuman(page, by("tab", { name: /^All/ }));
  await sleep(900);

  await setCaption(page, "Shop as", "Profile has three shoppers — Sujata, Priya, Kabir.");
  mark("Shop as", "Profile has three shoppers — Sujata, Priya, Kabir.");
  await clickHuman(page, by("button", { name: "Profile" }));
  await page.getByRole("listbox", { name: "Shoppers" }).waitFor();
  await page.getByText("Priya").first().waitFor();
  await page.getByText("Kabir").first().waitFor();
  await sleep(1600);
  await clickHuman(page, page.locator(".drawer").getByRole("button", { name: "Home" }));
  await sleep(700);

  await setCaption(page, "Wishlist alerts", "Two mutes: size and occasion. Dead items never notify. No price-drop alert.");
  mark("Wishlist alerts", "Two mutes: size and occasion. Dead items never notify. No price-drop alert.");
  await clickHuman(page, by("button", { name: "Wishlist", exact: true }));
  await by("heading", { name: "Wishlist" }).waitFor();
  await clickHuman(page, by("button", { name: "Notification settings" }));
  await by("heading", { name: "Wishlist alerts" }).waitFor();
  await sleep(1500);
  await clickHuman(page, by("button", { name: "Back" }));
  await sleep(500);

  await setCaption(page, "Wrong size", "Size L came back. Watch is S — so this stays silent on purpose.");
  mark("Wrong size", "Size L came back. Watch is S — so this stays silent on purpose.");
  await clickHuman(page, by("button", { name: "Notifications" }));
  await sleep(600);
  await clickHuman(page, by("button", { name: /Other size restocked \(L\)/ }));
  await page.locator(".quiet-toast").getByText(/saved watch is S/).waitFor();
  await sleep(1800);

  await setCaption(page, "Your size is back", "Size S restocked — ping opens the My size tab with S selected.");
  mark("Your size is back", "Size S restocked — ping opens the My size tab with S selected.");
  await clickHuman(page, by("button", { name: "Notifications" }));
  await sleep(600);
  await clickHuman(page, by("button", { name: "My size S is back" }));
  await page.locator(".push-banner").getByText("Your size is back").waitFor();
  await by("tab", { name: /My size/ }).waitFor();
  await sleep(2000);

  await setCaption(page, "Occasion reminder", "Occasion ping opens the Occasion tab on those items.");
  mark("Occasion reminder", "Occasion ping opens the Occasion tab on those items.");
  await clickHuman(page, by("button", { name: "Notifications" }));
  await sleep(600);
  await clickHuman(page, by("button", { name: "Occasion is coming up" }));
  await by("heading", { name: "Wishlist" }).waitFor();
  await by("tab", { name: /Occasion/ }).waitFor();
  await page.getByText("Flared Ethnic Maxi").waitFor();
  await sleep(1800);

  await setCaption(page, "Bag", "Moving an occasion piece to bag — recs stay on this page.");
  mark("Bag", "Moving an occasion piece to bag — recs stay on this page.");
  const occasionCard = page.locator("article").filter({ hasText: "Flared Ethnic Maxi" }).first();
  await clickHuman(page, occasionCard.getByRole("button", { name: "MOVE TO BAG" }));
  await by("heading", { name: "Shopping Bag" }).waitFor();
  await by("heading", { name: "Recommended for this purchase" }).waitFor();
  await sleep(1800);
  await setCaption(page, "Order", "Place order sits next to the item — this is the buy moment the reminder was for.");
  mark("Order", "Place order sits next to the item — this is the buy moment the reminder was for.");
  await clickHuman(page, by("button", { name: "Place order" }));
  await page.getByText("Order successful").waitFor();
  await sleep(2400);
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
