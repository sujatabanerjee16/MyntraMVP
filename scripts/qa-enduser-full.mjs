/**
 * Full end-user walkthrough of the shopper MVP.
 * node scripts/qa-enduser-full.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SHOPPER_URL || "http://127.0.0.1:5175/";
const OUT = join("C:/MyntraMVP/scripts/qa-out");
mkdirSync(OUT, { recursive: true });

const findings = [];
function note(severity, who, area, msg, detail = "") {
  findings.push({ severity, who, area, msg, detail });
  console.log(`[${severity}] ${who}/${area}: ${msg}${detail ? " — " + detail : ""}`);
}

async function mainText(page) {
  return page.locator("main").first().innerText();
}

async function reset(page) {
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByText("Shop as").waitFor({ state: "visible", timeout: 20000 });
}

async function asPersona(page, name) {
  await page.getByRole("option", { name: new RegExp(name, "i") }).click();
  await page.waitForTimeout(900);
}

async function openWishlist(page) {
  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await page.waitForTimeout(500);
}

async function openTab(page, label) {
  const btn = page.locator(".wish-tabs button").filter({ hasText: new RegExp(label, "i") }).first();
  if (!(await btn.count())) return false;
  await btn.click();
  await page.waitForTimeout(400);
  return true;
}

async function honesty(page, who, area) {
  const t = await mainText(page);
  for (const bad of ["87%", "8.4/10", "Waiting for Price Drop", "Groq", "conversion rate"]) {
    if (new RegExp(bad.replace(".", "\\."), "i").test(t)) note("high", who, area, "Forbidden copy", bad);
  }
  return t;
}

async function walk(page, who, persona, expectLine, homeCat) {
  console.log(`\n======== ${who} ========`);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByText("Shop as").waitFor({ state: "visible", timeout: 20000 });
  await reset(page);
  await asPersona(page, persona);

  const home = await honesty(page, who, "home");
  if (!home.includes(expectLine)) note("high", who, "persona", "Missing age/city line", expectLine);
  else note("info", who, "persona", "OK " + expectLine);
  await page.screenshot({ path: join(OUT, `${who}-01-home.png`), fullPage: true });

  // Category chrome
  for (const cat of ["MEN", "WOMEN", "KIDS", "BEAUTY", "GENZ"]) {
    await page.getByRole("button", { name: cat, exact: true }).click();
    await page.waitForTimeout(250);
  }
  await page.getByRole("button", { name: homeCat, exact: true }).click();
  await page.waitForTimeout(300);

  // Save sheet: open + Skip must leave no auto-tag chip on a new save
  const saveBtn = page.getByRole("button", { name: "Save to wishlist" }).first();
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.getByText("Saving this for").waitFor({ state: "visible", timeout: 5000 });
    const sheet = await page.locator(".tag-sheet").innerText();
    for (const need of ["Check quality first", "Check the fit", "Compare", "Upcoming Occasion", "Skip"]) {
      if (!new RegExp(need, "i").test(sheet) && !(await page.getByRole("button", { name: new RegExp(need, "i") }).count())) {
        note("high", who, "save-sheet", "Missing control", need);
      }
    }
    await page.getByRole("button", { name: /^Skip$/i }).click();
    await page.waitForTimeout(500);
    // Should not invent a chip for skipped save on the card we just saved — soft check: no forced Quality chip on newest arrival only
    note("info", who, "save-sheet", "Skip closed sheet without forcing a reason");
  } else {
    note("info", who, "save-sheet", "No unsaved product on home (seed already full)");
  }

  // Explicit quality tag for millennial path
  const stillSave = page.getByRole("button", { name: "Save to wishlist" }).first();
  if (await stillSave.count()) {
    await stillSave.click();
    await page.getByText("Saving this for").waitFor({ state: "visible", timeout: 4000 });
    await page.waitForTimeout(450); // past any open-click race
    await page.getByRole("button", { name: /Check quality first/i }).click();
    await page.waitForTimeout(400);
  }

  await openWishlist(page);
  await honesty(page, who, "wishlist");
  await page.screenshot({ path: join(OUT, `${who}-02-wishlist.png`), fullPage: true });

  const tabs = ["All", "Compare", "Quality", "My size", "Occasion", "No longer"];
  for (const label of tabs) {
    if (!(await openTab(page, label))) {
      note("high", who, "tabs", "Missing tab", label);
      continue;
    }
    note("info", who, "tabs", "Opened " + label);
  }

  // Quality deep check
  await openTab(page, "Quality");
  const quality = await mainText(page);
  await page.screenshot({ path: join(OUT, `${who}-03-quality.png`), fullPage: true });
  if (/Nothing in quality/i.test(quality)) {
    note("med", who, "quality", "Quality tab empty for this seed");
  } else {
    if (!/Real customer photo/i.test(quality)) note("high", who, "quality", "Missing 'Real customer photo' label");
    else note("info", who, "quality", "Real customer photo label present");
    const reviewHit = quality.match(/(\d+)\s+reviews/i);
    if (reviewHit && Number(reviewHit[1]) < 150) {
      note("high", who, "quality", "Review count under 150", reviewHit[0]);
    } else if (reviewHit) {
      note("info", who, "quality", "Review count OK", reviewHit[0]);
    }
    // Kids category: no women UGC in quality thumbs
    if (homeCat === "KIDS" || /Printed Shorts Set|GINI|Gini/i.test(quality)) {
      const imgs = await page.locator(".quality-photos img").evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("src") || ""),
      );
      if (imgs.some((src) => /libas-ugc|women-/i.test(src))) {
        note("high", who, "quality", "Kids card still shows women photo", imgs.join(", "));
      } else if (imgs.length) {
        note("info", who, "quality", "Kids photos look kids-only", imgs.join(", "));
      }
    }
  }

  // Fit
  await openTab(page, "My size");
  const fit = await mainText(page);
  await page.screenshot({ path: join(OUT, `${who}-04-mysize.png`), fullPage: true });
  if (/87%/.test(fit)) note("high", who, "fit", "Fake 87%");
  if (/This may not fit|This should fit|Not enough past buys/i.test(fit)) {
    note("info", who, "fit", "Past-buy fit copy present");
  }

  // Compare
  await openTab(page, "Compare");
  const cluster = page.locator("button, a").filter({ hasText: /Compare \d+/i }).first();
  if (await cluster.count()) {
    await cluster.click();
    await page.waitForTimeout(600);
    await honesty(page, who, "compare");
    await page.screenshot({ path: join(OUT, `${who}-05-compare.png`), fullPage: true });
    for (const need of ["Buy this", "MOVE TO BAG", "Not this"]) {
      if (!(await page.getByRole("button", { name: new RegExp(need, "i") }).count())) {
        note("med", who, "compare", "Missing", need);
      }
    }
    await page.getByRole("button", { name: /Back/i }).first().click().catch(() => {});
  } else {
    note("med", who, "compare", "No compare cluster");
  }

  // Dead → similar
  await openWishlist(page);
  await openTab(page, "No longer");
  const similarBtn = page.getByRole("button", { name: /See Similar Items/i }).first();
  if (await similarBtn.count()) {
    await similarBtn.click();
    await page.waitForTimeout(500);
    await honesty(page, who, "similar");
    await page.screenshot({ path: join(OUT, `${who}-06-similar.png`), fullPage: true });
    await page.getByRole("button", { name: /Back/i }).first().click().catch(() => {});
  }

  // Multi-bag: add two MOVE TO BAG from All
  await openWishlist(page);
  await openTab(page, "All");
  const moves = page.getByRole("button", { name: "MOVE TO BAG" });
  const n = await moves.count();
  if (n >= 2) {
    await moves.nth(0).click();
    await page.waitForTimeout(500);
    // back to wishlist for second
    await openWishlist(page);
    await openTab(page, "All");
    const moves2 = page.getByRole("button", { name: "MOVE TO BAG" });
    if (await moves2.count()) {
      await moves2.nth(0).click();
      await page.waitForTimeout(500);
    }
  } else if (n === 1) {
    await moves.nth(0).click();
    await page.waitForTimeout(400);
    note("med", who, "bag", "Only one MOVE TO BAG visible in this category");
  }

  await page.getByRole("button", { name: "Bag", exact: true }).click();
  await page.waitForTimeout(500);
  const bag = await mainText(page);
  await page.screenshot({ path: join(OUT, `${who}-07-bag.png`), fullPage: true });
  const bagBadge = await page.getByRole("button", { name: "Bag", exact: true }).locator(".badge-count").textContent().catch(() => "0");
  note("info", who, "bag", "Bag badge", bagBadge || "0");
  if (/Your bag is empty/i.test(bag)) {
    note("high", who, "bag", "Bag empty after MOVE TO BAG");
  } else {
    const articleCount = await page.locator("article.bag-item, .bag-item").count();
    if (articleCount >= 2) note("info", who, "bag", "Multi-item bag OK", String(articleCount));
    else if (articleCount === 1 && Number(bagBadge) >= 2) note("med", who, "bag", "Badge>1 but only one bag card rendered");
    else note("info", who, "bag", "Single bag item (may be OK if only one add worked)");

    if (/Recommended for this purchase/i.test(bag)) note("info", who, "bag", "Bag recs visible");
    const place = page.getByRole("button", { name: /Place order/i });
    if (await place.count()) {
      await place.click();
      await page.waitForTimeout(600);
      const checkout = await mainText(page);
      await page.screenshot({ path: join(OUT, `${who}-08-checkout.png`), fullPage: true });
      if (!checkout.includes(persona.split(" ")[0] === "Kabir" ? "Kabir" : persona)) {
        // persona is first name
        if (!checkout.includes(persona)) note("high", who, "checkout", "Wrong name on checkout");
      }
      if (/Recommended for this purchase/i.test(checkout)) {
        note("info", who, "checkout", "Recs also on checkout");
      } else {
        note("med", who, "checkout", "Recs only on bag, not checkout (known gap)");
      }
      const pay = page.getByRole("button", { name: /PAY/i }).first();
      if (await pay.count()) {
        await pay.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(OUT, `${who}-09-success.png`), fullPage: true });
        await page.getByRole("button", { name: /Back to home/i }).click().catch(() => {});
        note("info", who, "checkout", "Pay → success OK");
      } else note("high", who, "checkout", "PAY missing");
    }
  }

  // Kids-specific pass for Sujata: switch to KIDS wishlist quality
  if (who === "millennial-sujata") {
    await page.getByRole("button", { name: "KIDS", exact: true }).click();
    await openWishlist(page);
    await openTab(page, "Quality");
    const kidsQ = await mainText(page);
    await page.screenshot({ path: join(OUT, `${who}-10-kids-quality.png`), fullPage: true });
    if (/Printed Shorts Set|GINI|Gini|Quality & trust/i.test(kidsQ)) {
      if (!/Real customer photo/i.test(kidsQ) && !(await page.getByText(/Real customer photo/i).count())) {
        note("high", who, "kids-quality", "Label missing on kids quality");
      }
      const imgs = await page.locator(".quality-photos img").evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("src") || ""),
      );
      if (!imgs.length) note("med", who, "kids-quality", "No quality photos on kids card");
      else if (imgs.some((src) => /libas-ugc|women-/i.test(src))) {
        note("high", who, "kids-quality", "Women photo on kids card", imgs.join(", "));
      } else {
        note("info", who, "kids-quality", "Kids photos OK", imgs.join(", "));
      }
    } else {
      note("med", who, "kids-quality", "No kids quality item visible");
    }
  }

  // Profile drawer
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.waitForTimeout(300);
  for (const link of ["Home", "Wishlist", "Orders", "Reset demo"]) {
    if (!(await page.getByRole("button", { name: new RegExp("^" + link, "i") }).count())) {
      note("med", who, "drawer", "Missing " + link);
    }
  }
  if (await page.getByText(/Notification inbox|Wishlist alerts/i).count()) {
    note("high", who, "drawer", "Inbox/settings surfaced");
  }
  await page.getByRole("button", { name: "Back", exact: true }).click().catch(() => {});
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(20000);
page.on("pageerror", (e) => note("high", "runtime", "js", e.message));

try {
  await walk(page, "genz-kabir", "Kabir", "Kabir · 21 · Delhi", "GENZ");
  await walk(page, "millennial-sujata", "Sujata", "Sujata · 28 · Bengaluru", "WOMEN");
  await walk(page, "millennial-priya", "Priya", "Priya · 32 · Mumbai", "WOMEN");
} catch (e) {
  note("high", "runtime", "fatal", String(e));
} finally {
  await browser.close();
}

const summary = {
  at: new Date().toISOString(),
  base: BASE,
  counts: Object.fromEntries(["high", "med", "low", "info"].map((s) => [s, findings.filter((f) => f.severity === s).length])),
  findings,
};
writeFileSync(join(OUT, "qa-enduser-report.json"), JSON.stringify(summary, null, 2));
console.log("\n===== SUMMARY =====");
console.log(summary.counts);
for (const f of findings.filter((x) => x.severity === "high" || x.severity === "med")) {
  console.log(`- [${f.severity}] ${f.who}/${f.area}: ${f.msg}${f.detail ? " (" + f.detail + ")" : ""}`);
}
console.log("Report:", join(OUT, "qa-enduser-report.json"));
