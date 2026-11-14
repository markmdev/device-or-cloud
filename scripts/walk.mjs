// Walks the judge's path on the live site in a Chrome that already has the built-in model.
// CDP=http://127.0.0.1:<port> [SITE=https://...] [APPCHECK_DEBUG_TOKEN=...] [SHOTS=<folder>] node scripts/walk.mjs
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const site = process.env.SITE ?? "https://device-or-cloud.web.app";
const modes = Object.entries(JSON.parse(readFileSync("remoteconfig.template.json", "utf8")).parameters).map(([key, p]) => [key.replace("mode_", ""), p.defaultValue.value]);
const browser = await chromium.connectOverCDP(process.env.CDP);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
if (process.env.APPCHECK_DEBUG_TOKEN) await context.addInitScript((token) => { self.FIREBASE_APPCHECK_DEBUG_TOKEN = token; }, process.env.APPCHECK_DEBUG_TOKEN);
const page = await context.newPage();
page.on("pageerror", (e) => console.log("page crashed:", String(e).slice(0, 300)));

let failed = 0;
const expect = (ok, what) => { console.log(ok ? "ok  " : "FAIL", what); if (!ok) failed++; };
const shot = (name) => process.env.SHOTS && page.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true });

// The check: the recorded verdicts, the proof, the bottom line and its controls.
await page.goto(site);
await page.locator(".sides").waitFor();
expect(/Recorded on a .+, Chrome \d+, \d+ \w+ 20\d\d/.test(await page.locator("header").innerText()), "the check says where and when it was recorded");
expect((await page.locator(".feature").count()) === modes.length, `all ${modes.length} features have a verdict`);
const onDevice = modes.filter(([, mode]) => mode === "prefer_on_device").length;
expect((await page.locator(".sides .device .feature").count()) === onDevice, `${onDevice} features are on the device side, as published`);
expect((await page.locator(".bottom h2").innerText()).includes(`${onDevice} of ${modes.length} features`), "the bottom line counts the same");
await page.getByLabel("Wrong answers allowed in 100").press("Home");
expect((await page.locator(".bottom h2").innerText()).startsWith("With no wrong answers allowed"), "the bar moves the verdicts and the headline names it");
for (let i = 0; i < 10; i++) await page.getByLabel("Wrong answers allowed in 100").press("ArrowRight");
expect((await page.locator(".sides .device .feature").count()) === onDevice, "back at the default bar, the published split shows again");
expect((await page.locator(".proof pre").count()) === 1, "a failure is shown with its input and both answers");
const money = () => page.locator(".money b").innerText();
const before = await money();
await page.getByLabel("Requests a month for each feature").fill("500000");
expect(onDevice === 0 || (await money()) !== before, "the money follows the request count");
await shot("check");

// A feature kept in the cloud: the recorded one-line fixes, and a line of the reader's own on Chrome's model.
expect(/after one-line fixes/.test(await page.locator(".bottom h2").innerText()), "the bottom line counts what one-line fixes move");
await page.locator(".sides .cloud .feature", { hasText: "Read a review's mood" }).click();
expect((await page.locator('.fixes .fix[data-moved="true"] blockquote').count()) > 0, "a recorded line moves the mood feature, shown with its counts");
await page.getByRole("button", { name: "Run Chrome's model with this line" }).click();
await page.locator(".fix.yours p", { hasText: "On the check's 25 inputs" }).waitFor({ timeout: 600_000 }).catch(() => {});
expect((await page.locator(".fix.yours p", { hasText: "On the check's 25 inputs" }).count()) === 1, "a line of the reader's own runs on this computer and gets its counts");
await shot("fixes");

// Run it here: Chrome's model answers live, then stop.
await page.getByRole("button", { name: "Run it on your own computer" }).click();
await page.getByRole("button", { name: /Stop · .+: [1-9]/ }).waitFor({ timeout: 120_000 });
expect(true, "the device side reruns on this computer");
await page.getByRole("button", { name: /Stop/ }).click();
await page.getByRole("button", { name: "Run it on your own computer" }).waitFor({ timeout: 60_000 });

// The shop: every feature answers where Remote Config says, and says so.
await page.goto(`${site}/shop/`);
await page.locator(".card").first().waitFor();
for (const [id, mode] of modes) {
  const card = page.locator(`[data-feature="${id}"]`);
  await card.locator(".actions button").first().click();
  await card.locator('.badge[data-ran="true"]').waitFor({ timeout: 90_000 }).catch(() => {});
  const want = mode === "prefer_on_device" ? "on_device" : "in_cloud";
  const ran = (await card.locator(".badge").getAttribute("data-source")) === want && (await card.locator(".badge").getAttribute("data-ran")) === "true";
  expect(ran, `shop: ${id} ran ${want === "on_device" ? "on this computer" : "in the cloud"}`);
  if (!ran) console.log("     the card says:", (await card.locator(".result").innerText()).replace(/\s+/g, " ").slice(0, 300));
}
await shot("shop");

// Wi-Fi off: device features still answer, cloud features say they need a connection.
await context.setOffline(true);
for (const [id, mode] of [modes.find(([, m]) => m === "prefer_on_device"), modes.find(([, m]) => m !== "prefer_on_device")].filter(Boolean)) {
  const card = page.locator(`[data-feature="${id}"]`);
  await card.locator(".actions button").first().click();
  if (mode === "prefer_on_device") {
    await card.locator('.badge[data-ran="true"]').waitFor({ timeout: 90_000 }).catch(() => {});
    expect((await card.locator(".badge").getAttribute("data-ran")) === "true", `offline: ${id} still answers on this computer`);
  } else {
    await card.locator(".wrong").waitFor({ timeout: 90_000 }).catch(() => {});
    expect(/needs a connection/.test(await card.locator(".result").innerText()), `offline: ${id} says it needs a connection`);
  }
}
await shot("shop-offline");
await context.setOffline(false);
await context.close();
await browser.close();
process.exit(failed ? 1 : 0);
