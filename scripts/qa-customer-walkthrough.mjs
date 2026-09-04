/**
 * Customer QA walkthrough: Kabir (Gen Z) + Sujata (Millennial).
 * Run: node scripts/qa-customer-walkthrough.mjs
 * Assumes Vite at http://127.0.0.1:5175/
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SHOPPER_URL || "http://127.0.0.1:5175/";
const OUT = join("C:/MyntraMVP/scripts/qa-out");
mkdirSync(OUT, { recursive: true });

const findings = [];
function note(severity, persona, area, message, detail = "") {
  findings.push({ severity, persona, area, message, detail });
  console.log(`[${severity}] ${persona}/${area}: ${message}${detail ? " — " + detail : ""}`);
}

const TYPO_PATTERNS = [
  { re: /\bUPTO\b/, msg: "UPTO missing space (prefer Up to / UP TO)" },
  { re: /\bWishlist's\b/i, msg: "Wishlist's apostrophe (prefer Wishlists are)" },
  { re: /\bteh\b|\badn\b|\boccassion\b|\boccassion\b|\bwishlistting\b/i, msg: "Likely typo" },
  { re: /  +/, msg: "Double spaces in visible text" },
  { re: /\bGenZ\b/, msg: "GenZ without space (prefer Gen Z)" },
  { re: /\bcolour\b/i, msg: "UK colour — check consistency with Color in titles" },
];

async function visibleText(page) {
  return page.evaluate(() => {
    const walk = (el, acc) => {
      if (!el || el.nodeType !== 1) return;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;
      if (el.matches?.("script,style,noscript")) return;
      for (const child of el.childNodes) {
        if (child.nodeType === 3) {
          const t = child.textContent?.replace(/\s+/g, " ").trim();
          if (t) acc.push(t);
        } else if (child.nodeType === 1) walk(child, acc);
      }
    };
    const acc = [];
    walk(document.body, acc);
    return acc.join("\n");
  });
}

async function auditCopy(page, persona, area) {
  const text = await visibleText(page);
  for (const { re, msg } of TYPO_PATTERNS) {
    if (re.test(text)) {
      const m = text.match(re);
      const key = `${persona}|${msg}|${m?.[0] ?? ""}`;
      if (!auditCopy._seen) auditCopy._seen = new Set();
      if (auditCopy._seen.has(key)) continue;
      auditCopy._seen.add(key);
      note("med", persona, area, msg, m?.[0] ?? "");
    }
  }
  if (/87%|8\.4\/10|Groq|Waiting for Price Drop|\binbox\b/i.test(text)) {
    note("high", persona, area, "Forbidden copy surfaced", text.match(/87%|8\.4\/10|Groq|Waiting for Price Drop|\binbox\b/i)?.[0]);
  }
  return text;
}

async function clickIf(page, selector, label, persona, area) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) {
    note("med", persona, area, `Missing control: ${label}`, selector);
    return false;
  }
  try {
    await loc.click({ timeout: 4000 });
    return true;
  } catch (e) {
    note("high", persona, area, `Click failed: ${label}`, String(e.message).slice(0, 120));
    return false;
  }
}

async function expectVisible(page, text, persona, area, severity = "high") {
  const loc = page.getByText(text, { exact: false }).first();
  try {
    await loc.waitFor({ state: "visible", timeout: 5000 });
    return true;
  } catch {
    note(severity, persona, area, `Expected visible text missing: ${text}`);
    return false;
  }
}

async function openProfile(page) {
  await page.getByRole("button", { name: "Profile" }).click();
  await page.waitForTimeout(300);
}

async function resetDemo(page) {
  await openProfile(page);
  const reset = page.getByRole("button", { name: "Reset demo" });
  if (await reset.count()) {
    await reset.click();
    await page.waitForTimeout(1000);
    // drawer should close; ensure home visible
    await page.getByText("Shop as").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  } else {
    await page.getByRole("button", { name: "Back" }).first().click().catch(() => {});
  }
}

async function switchPersona(page, name) {
  const opt = page.getByRole("option", { name: new RegExp(name, "i") });
  try {
    await opt.first().waitFor({ state: "visible", timeout: 5000 });
    await opt.first().click();
    await page.waitForTimeout(900);
    return true;
  } catch {
    return false;
  }
}

async function heartFirstUnsaved(page) {
  // Prefer labeled save buttons (home / catalog), skip already-saved
  const saves = page.getByRole("button", { name: "Save to wishlist" });
  const n = await saves.count();
  if (n > 0) {
    await saves.nth(0).click();
    return true;
  }
  const off = page.locator(".wish-heart:not(.is-on)").first();
  if (await off.count()) {
    await off.click();
    return true;
  }
  return false;
}

async function walkSaveSheet(page, persona, reasonLabel) {
  const sheet = page.getByText("Saving this for", { exact: false });
  try {
    await sheet.waitFor({ state: "visible", timeout: 4000 });
  } catch {
    note("med", persona, "save-sheet", "Save reason sheet did not open after heart");
    return false;
  }
  await auditCopy(page, persona, "save-sheet");
  await expectVisible(page, "Why did you save", persona, "save-sheet", "med");
  const choice = page.getByRole("button", { name: new RegExp(reasonLabel, "i") }).first();
  if (!(await choice.count())) {
    note("high", persona, "save-sheet", `Missing reason: ${reasonLabel}`);
    return false;
  }
  await choice.click();
  await page.waitForTimeout(500);
  // Occasion may ask for date
  if (/occasion/i.test(reasonLabel)) {
    const saveDate = page.getByRole("button", { name: /Save date/i });
    const skipDate = page.getByRole("button", { name: /Skip date/i });
    if (await saveDate.count()) {
      // pick a date if date input exists
      const input = page.locator('input[type="date"]').first();
      if (await input.count()) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        const iso = d.toISOString().slice(0, 10);
        await input.fill(iso);
      }
      await saveDate.click();
    } else if (await skipDate.count()) {
      await skipDate.click();
    }
  }
  await page.waitForTimeout(400);
  return true;
}

async function goWishlist(page) {
  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await page.waitForTimeout(500);
}

async function clickTab(page, name) {
  const tab = page.getByRole("button", { name: new RegExp(`^${name}`, "i") }).first();
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(400);
    return true;
  }
  // tabs may be role=tab
  const t2 = page.getByRole("tab", { name: new RegExp(name, "i") }).first();
  if (await t2.count()) {
    await t2.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function walkPersona(page, persona, cfg) {
  console.log(`\n=== ${persona} ===`);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Profile", { timeout: 20000 });
  await page.waitForTimeout(600);
  await resetDemo(page);
  await page.waitForTimeout(500);

  if (!(await switchPersona(page, cfg.switchName))) {
    note("high", persona, "persona", `Could not switch to ${cfg.switchName}`);
  }
  await expectVisible(page, cfg.expectLine, persona, "persona");
  await auditCopy(page, persona, "home");
  await page.screenshot({ path: join(OUT, `${persona}-01-home.png`), fullPage: true });

  // Category nav
  for (const cat of ["MEN", "WOMEN", "KIDS", "BEAUTY", "GENZ"]) {
    const ok = await clickIf(page, `button:has-text("${cat}")`, cat, persona, "nav");
    if (ok) {
      await page.waitForTimeout(300);
      await auditCopy(page, persona, `nav-${cat}`);
    }
  }
  // Back to preferred category
  await clickIf(page, `button:has-text("${cfg.homeCat}")`, cfg.homeCat, persona, "nav");

  // Save flows — try each reason once; if no unsaved product, edit via long-press later
  for (const reason of cfg.saveReasons) {
    await page.getByRole("button", { name: "Wishlist", exact: true }).click().catch(() => {});
    // return home via logo if possible
    await page.locator(".brand-lockup, .myntra-wordmark, button.brand").first().click().catch(() => {});
    await page.getByText("Shop as").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await clickIf(page, `nav button:has-text("${cfg.homeCat}"), .site-nav button:has-text("${cfg.homeCat}"), button:has-text("${cfg.homeCat}")`, cfg.homeCat, persona, "nav");
    await page.waitForTimeout(400);
    const hearted = await heartFirstUnsaved(page);
    if (!hearted) {
      note("info", persona, "save", "No new Save to wishlist left for " + reason);
      continue;
    }
    await walkSaveSheet(page, persona, reason);
    await page.waitForTimeout(400);
  }

  await goWishlist(page);
  await auditCopy(page, persona, "wishlist");
  await page.screenshot({ path: join(OUT, `${persona}-02-wishlist.png`), fullPage: true });

  const tabs = ["All", "Compare", "Quality", "My size", "Occasion", "No longer"];
  for (const tab of tabs) {
    const ok = await clickTab(page, tab);
    if (!ok) note("med", persona, "wishlist-tabs", `Tab not found: ${tab}`);
    else {
      await auditCopy(page, persona, `tab-${tab}`);
      // empty-state honesty
      const text = await visibleText(page);
      if (/Nothing in|empty|Save two of the same type/i.test(text)) {
        note("info", persona, `tab-${tab}`, "Empty/helper state shown (ok if intentional)");
      }
    }
  }

  // Quality tab deep check
  if (await clickTab(page, "Quality")) {
    const text = await visibleText(page);
    if (/x\/10|8\.4|fake/i.test(text) && /x\/10|8\.4/.test(text)) {
      note("high", persona, "quality", "Fake score pattern in quality tab");
    }
    if (/Fabric|Reviews|Photos|stars|★|rating/i.test(text)) {
      note("info", persona, "quality", "Quality evidence fields present");
    }
    // open size chart if link
    const chart = page.getByText("Size chart", { exact: false }).first();
    if (await chart.count()) {
      await chart.click();
      await page.waitForTimeout(300);
      await expectVisible(page, "Size", persona, "size-chart", "med");
      await page.getByRole("button", { name: /Close/i }).click().catch(() => {});
    }
  }

  // My size
  if (await clickTab(page, "My size")) {
    const text = await visibleText(page);
    if (/watching size|Notify when size/i.test(text) && /My size/i.test(text)) {
      // stock watch language on fit tab is a product bug
      if (/will it fit|past buys|This may not fit|This should fit|Not enough past buys/i.test(text) === false) {
        note("high", persona, "fit", "My size looks like stock watch, not past-buy fit");
      }
    }
    if (/87%/.test(text)) note("high", persona, "fit", "Fake 87% fit score");
  }

  // Compare
  if (await clickTab(page, "Compare")) {
    const cluster = page.getByText(/Compare \d+/i).first();
    if (await cluster.count()) {
      await cluster.click();
      await page.waitForTimeout(600);
      await auditCopy(page, persona, "compare");
      await page.screenshot({ path: join(OUT, `${persona}-03-compare.png`), fullPage: true });
      await expectVisible(page, "Buy this", persona, "compare", "med");
      // Not this
      const notThis = page.getByRole("button", { name: /Not this/i }).first();
      if (await notThis.count()) {
        await notThis.click();
        await page.waitForTimeout(400);
      }
      // MOVE TO BAG on buy this card if present
      const move = page.getByRole("button", { name: /MOVE TO BAG|Add to Bag/i }).first();
      if (await move.count()) {
        await move.click();
        await page.waitForTimeout(500);
      }
      await page.getByRole("button", { name: /Back/i }).first().click().catch(() => {});
    } else {
      note("med", persona, "compare", "No compare cluster available for this persona seed");
    }
  }

  // Dead / similar
  if (await clickTab(page, "No longer")) {
    const similar = page.getByRole("button", { name: /See Similar/i }).first();
    if (await similar.count()) {
      await similar.click();
      await page.waitForTimeout(500);
      await auditCopy(page, persona, "similar");
      await page.getByRole("button", { name: /Back/i }).first().click().catch(() => {});
    }
  }

  // Bag + checkout
  await page.getByRole("button", { name: "Bag", exact: true }).click();
  await page.waitForTimeout(500);
  await auditCopy(page, persona, "bag");
  const place = page.getByRole("button", { name: /Place order/i });
  if (await place.count()) {
    await place.click();
    await page.waitForTimeout(600);
    await auditCopy(page, persona, "checkout");
    await page.screenshot({ path: join(OUT, `${persona}-04-checkout.png`), fullPage: true });
    await expectVisible(page, cfg.checkoutName, persona, "checkout");
    // Recs
    const text = await visibleText(page);
    if (/Recommended for this purchase|Show me other options|Pairs well/i.test(text)) {
      note("info", persona, "checkout", "Checkout recs visible");
    }
    const skip = page.getByRole("button", { name: /^Skip$/i }).first();
    if (await skip.count()) await skip.click();
    const pay = page.getByRole("button", { name: /PAY/i }).first();
    if (await pay.count()) {
      await pay.click();
      await page.waitForTimeout(600);
      await auditCopy(page, persona, "success");
      await page.getByRole("button", { name: /Back to home/i }).click().catch(() => {});
    } else {
      note("med", persona, "checkout", "PAY button missing");
    }
  } else {
    note("med", persona, "bag", "Bag empty — Place order unavailable");
  }

  // Profile drawer nav
  await openProfile(page);
  for (const link of ["Home", "Wishlist", "Orders"]) {
    const btn = page.getByRole("button", { name: link }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(400);
      await auditCopy(page, persona, `drawer-${link}`);
      if (link !== "Home") await openProfile(page);
    } else {
      note("med", persona, "drawer", `Missing drawer link: ${link}`);
    }
  }

  // Footer look: non-clickable links?
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const faq = page.getByText("FAQ", { exact: true }).first();
  if (await faq.count()) {
    const tag = await faq.evaluate((el) => el.tagName);
    if (tag === "P" || tag === "SPAN") {
      note("low", persona, "footer", "FAQ looks like a link but is not clickable", tag);
    }
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);

page.on("pageerror", (err) => note("high", "runtime", "js", err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") note("med", "runtime", "console", msg.text().slice(0, 160));
});

try {
  await walkPersona(page, "genz-kabir", {
    switchName: "Kabir",
    expectLine: "Kabir · 21",
    homeCat: "GENZ",
    checkoutName: "Kabir Mehta",
    saveReasons: ["Check quality first", "Check the fit", "Compare", "Upcoming Occasion"],
  });

  await walkPersona(page, "millennial-sujata", {
    switchName: "Sujata",
    expectLine: "Sujata · 28",
    homeCat: "WOMEN",
    checkoutName: "Sujata Banerjee",
    saveReasons: ["Check quality first", "Check the fit", "Compare", "Upcoming Occasion"],
  });

  // Also quick Priya
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Profile", { timeout: 20000 });
  await resetDemo(page);
  if (await switchPersona(page, "Priya")) {
    await expectVisible(page, "Priya · 32", "millennial-priya", "persona");
    await goWishlist(page);
    await auditCopy(page, "millennial-priya", "wishlist");
    await page.screenshot({ path: join(OUT, `priya-wishlist.png`), fullPage: true });
  } else {
    note("med", "millennial-priya", "persona", "Could not switch to Priya");
  }
} catch (e) {
  note("high", "runtime", "fatal", String(e));
} finally {
  await browser.close();
}

const summary = {
  base: BASE,
  at: new Date().toISOString(),
  counts: {
    high: findings.filter((f) => f.severity === "high").length,
    med: findings.filter((f) => f.severity === "med").length,
    low: findings.filter((f) => f.severity === "low").length,
    info: findings.filter((f) => f.severity === "info").length,
  },
  findings,
};
writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(summary, null, 2));
console.log("\n=== SUMMARY ===");
console.log(summary.counts);
console.log("Report:", join(OUT, "qa-report.json"));
