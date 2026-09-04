/**
 * Seeded customer QA — uses pre-filled wishlists (Sujata millennial, Kabir Gen Z).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:5175/";
const OUT = join("C:/MyntraMVP/scripts/qa-out");
mkdirSync(OUT, { recursive: true });
const findings = [];
const note = (severity, persona, area, message, detail = "") => {
  findings.push({ severity, persona, area, message, detail });
  console.log(`[${severity}] ${persona}/${area}: ${message}${detail ? " — " + detail : ""}`);
};

async function reset(page) {
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByText("Shop as").waitFor({ state: "visible", timeout: 15000 });
}

async function asPersona(page, name) {
  await page.getByRole("option", { name: new RegExp(name, "i") }).click();
  await page.waitForTimeout(800);
}

async function wishlist(page) {
  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await page.waitForTimeout(500);
}

async function tab(page, label) {
  // Tabs include counts: "Quality & trust (7)"
  const btn = page.locator("button.wish-tab, [role='tab'], .wishlist-tabs button").filter({ hasText: new RegExp(label, "i") }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(400);
    return true;
  }
  const loose = page.getByRole("button", { name: new RegExp(label, "i") }).first();
  if (await loose.count()) {
    await loose.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function textOf(page) {
  return page.locator("main.web-page, main").first().innerText();
}

async function walk(page, persona, name, expectAgeCity) {
  console.log("\n===", persona, "===");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByText("Shop as").waitFor({ state: "visible", timeout: 20000 });
  await reset(page);
  await asPersona(page, name);
  const home = await textOf(page);
  if (!home.includes(expectAgeCity)) note("high", persona, "persona", "Age/city line missing", expectAgeCity);
  else note("info", persona, "persona", "OK " + expectAgeCity);

  // Honesty guards
  for (const bad of ["87%", "8.4/10", "Waiting for Price Drop", "Groq", "conversion rate", "15%"]) {
    if (new RegExp(bad.replace("%", "\\%"), "i").test(home) && bad !== "15%") {
      // allow prices like ₹1,599
      if (bad === "15%" && /wishlist.?cart|conversion/i.test(home)) note("high", persona, "honesty", bad);
      else if (bad !== "15%") note("high", persona, "honesty", "Forbidden: " + bad);
    }
  }
  if (/UPTO/.test(home)) note("med", persona, "copy", "UPTO should be UP TO / Up to");
  if (/Medal worthy/.test(home)) note("low", persona, "copy", "Medal worthy → medal-worthy");
  if (/\bGenZ\b/.test(home)) note("med", persona, "copy", "GenZ → Gen Z");

  // Save sheet from a Save to wishlist if any
  const saveBtn = page.getByRole("button", { name: "Save to wishlist" }).first();
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.getByText("Saving this for").waitFor({ state: "visible", timeout: 5000 });
    const sheet = await textOf(page);
    for (const label of ["Check quality first", "Check the fit", "Compare", "Upcoming Occasion", "Skip"]) {
      if (!sheet.includes(label.split(" ")[0]) && label !== "Skip") {
        // looser
      }
      const b = page.getByRole("button", { name: new RegExp(label, "i") });
      if (!(await b.count())) note("high", persona, "save-sheet", "Missing: " + label);
    }
    // Check question copy
    if (!/Why did you save this/i.test(sheet)) note("med", persona, "save-sheet", "Missing why-question copy");
    // Capitalization: Upcoming Occasion vs others Title Case — note drift
    if (/Upcoming Occasion/.test(sheet) && /Check quality first/.test(sheet)) {
      note("low", persona, "save-sheet", "Capitalization drift: 'Upcoming Occasion' vs sentence-case siblings");
    }
    await page.getByRole("button", { name: /Skip/i }).last().click();
    await page.waitForTimeout(400);
  }

  await wishlist(page);
  await page.screenshot({ path: join(OUT, `${persona}-wishlist.png`), fullPage: true });
  const wish = await textOf(page);

  const tabs = [
    ["All", /All/i],
    ["Compare", /Compare/i],
    ["Quality & trust", /Quality/i],
    ["My size", /My size/i],
    ["Occasion", /Occasion/i],
    ["No longer available", /No longer/i],
  ];
  for (const [label] of tabs) {
    const ok = await tab(page, label === "All" ? "^All" : label);
    if (!ok) {
      note("high", persona, "tabs", "Missing tab: " + label);
      continue;
    }
    const t = await textOf(page);
    note("info", persona, "tabs", "Opened " + label);
    if (label === "Quality & trust") {
      if (/x\/10|8\.4/.test(t)) note("high", persona, "quality", "Fake score");
      if (!/Fabric|Reviews|Photos|Quality/i.test(t) && !/Nothing in/i.test(t)) {
        note("med", persona, "quality", "No quality evidence visible");
      }
      await page.screenshot({ path: join(OUT, `${persona}-quality.png`), fullPage: true });
    }
    if (label === "My size") {
      if (/watching size|Notify when size/i.test(t) && !/past buys|may not fit|should fit|Not enough past buys/i.test(t)) {
        note("high", persona, "fit", "Looks like stock watch");
      }
      if (/87%/.test(t)) note("high", persona, "fit", "Fake 87%");
      await page.screenshot({ path: join(OUT, `${persona}-mysize.png`), fullPage: true });
    }
    if (label === "Occasion") {
      if (/watching|restock/i.test(t) && /Occasion/i.test(t) && !/wear|days away|Friend|Wedding|Office/i.test(t)) {
        note("med", persona, "occasion", "Occasion copy unclear");
      }
    }
  }

  // Compare flow
  await tab(page, "Compare");
  const cluster = page.getByRole("button", { name: /Compare \d+/i }).first();
  const cluster2 = page.locator("button, a").filter({ hasText: /Compare \d+/i }).first();
  const c = (await cluster.count()) ? cluster : cluster2;
  if (await c.count()) {
    await c.click();
    await page.waitForTimeout(600);
    const cmp = await textOf(page);
    await page.screenshot({ path: join(OUT, `${persona}-compare.png`), fullPage: true });
    for (const need of ["Buy this", "MOVE TO BAG", "Not this"]) {
      if (!new RegExp(need, "i").test(cmp) && !(await page.getByRole("button", { name: new RegExp(need, "i") }).count())) {
        note("med", persona, "compare", "Missing control/copy: " + need);
      }
    }
    if (/saree/i.test(cmp) && /dress/i.test(cmp) && /Women/i.test(cmp)) {
      // mixed types would be bad — soft check only if both in title line
    }
    // Bag from compare
    const move = page.getByRole("button", { name: "MOVE TO BAG" }).first();
    if (await move.count()) {
      await move.click();
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: /Back/i }).first().click().catch(() => {});
  } else {
    note("med", persona, "compare", "No compare cluster for seeded wishlist");
  }

  // Dead similar
  await wishlist(page);
  await tab(page, "No longer");
  const sim = page.getByRole("button", { name: /See Similar Items/i }).first();
  if (await sim.count()) {
    await sim.click();
    await page.waitForTimeout(500);
    const similar = await textOf(page);
    if (/\bcolour\b/i.test(similar) && /\bColor\b/.test(similar)) {
      note("low", persona, "similar", "colour vs Color mix on same surface");
    }
    await page.screenshot({ path: join(OUT, `${persona}-similar.png`), fullPage: true });
    await page.getByRole("button", { name: /Back/i }).first().click().catch(() => {});
  }

  // Bag from wishlist MOVE TO BAG if bag empty
  await wishlist(page);
  await tab(page, "All");
  const moveWish = page.getByRole("button", { name: "MOVE TO BAG" }).first();
  if (await moveWish.count()) {
    await moveWish.click();
    await page.waitForTimeout(500);
  }
  await page.getByRole("button", { name: "Bag", exact: true }).click();
  await page.waitForTimeout(400);
  const bag = await textOf(page);
  await page.screenshot({ path: join(OUT, `${persona}-bag.png`), fullPage: true });
  if (/Your bag is empty/i.test(bag)) {
    note("med", persona, "bag", "Bag still empty after MOVE TO BAG attempts");
  } else {
    const place = page.getByRole("button", { name: /Place order/i });
    if (await place.count()) {
      await place.click();
      await page.waitForTimeout(600);
      const checkout = await textOf(page);
      await page.screenshot({ path: join(OUT, `${persona}-checkout.png`), fullPage: true });
      if (!checkout.includes(name === "Kabir" ? "Kabir" : name)) {
        note("high", persona, "checkout", "Wrong / missing shopper name on checkout");
      }
      if (/Recommended for this purchase|Show me other options|Pairs well|Why we picked/i.test(checkout)) {
        note("info", persona, "checkout", "Recs present");
      } else {
        note("med", persona, "checkout", "No checkout recs visible");
      }
      // Skip rec if any then pay
      const skip = page.getByRole("button", { name: /^Skip$/ }).first();
      if (await skip.count()) await skip.click();
      const pay = page.getByRole("button", { name: /PAY/i }).first();
      if (await pay.count()) {
        await pay.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(OUT, `${persona}-success.png`), fullPage: true });
        await page.getByRole("button", { name: /Back to home/i }).click().catch(() => {});
      } else note("high", persona, "checkout", "PAY missing");
    }
  }

  // Profile drawer
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.waitForTimeout(300);
  const drawer = await page.locator("aside.drawer").innerText().catch(() => "");
  for (const link of ["Home", "Wishlist", "Orders", "Reset demo"]) {
    if (!new RegExp(link, "i").test(drawer) && !(await page.getByRole("button", { name: new RegExp(link, "i") }).count())) {
      note("med", persona, "drawer", "Missing: " + link);
    }
  }
  // No settings / inbox
  if (/Notification inbox|Wishlist alerts/i.test(drawer)) note("high", persona, "drawer", "Inbox/settings surfaced");
  await page.getByRole("button", { name: "Back", exact: true }).click().catch(() => {});
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(20000);
page.on("pageerror", (e) => note("high", "runtime", "js", e.message));

try {
  await walk(page, "genz-kabir", "Kabir", "Kabir · 21 · Delhi");
  await walk(page, "millennial-sujata", "Sujata", "Sujata · 28 · Bengaluru");
  await walk(page, "millennial-priya", "Priya", "Priya · 32 · Mumbai");
} catch (e) {
  note("high", "runtime", "fatal", String(e));
} finally {
  await browser.close();
}

const summary = {
  at: new Date().toISOString(),
  counts: Object.fromEntries(["high", "med", "low", "info"].map((s) => [s, findings.filter((f) => f.severity === s).length])),
  findings,
};
writeFileSync(join(OUT, "qa-report-seeded.json"), JSON.stringify(summary, null, 2));
console.log("\nSUMMARY", summary.counts);
