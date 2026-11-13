// Walks the live page in a Chrome that already has the built-in model, started with --remote-debugging-port.
// CDP=http://127.0.0.1:<port> SITE=https://... APPCHECK_DEBUG_TOKEN=<a debug token registered for the web app>
import { chromium } from "playwright-core";

const site = process.env.SITE ?? "https://device-or-cloud.web.app";
const browser = await chromium.connectOverCDP(process.env.CDP);
const page = await browser.contexts()[0].newPage();
page.on("console", (m) => m.type() === "error" && console.log("page error:", m.text().slice(0, 300)));
await page.addInitScript((token) => { self.FIREBASE_APPCHECK_DEBUG_TOKEN = token; }, process.env.APPCHECK_DEBUG_TOKEN);
await page.goto(site);
await page.getByRole("button", { name: "Run it" }).click();
await page.getByRole("button", { name: "Run it" }).and(page.locator(":enabled")).waitFor({ timeout: 120_000 });

let failed = false;
for (const [title, expected] of [["On this computer", "on_device"], ["In the cloud", "in_cloud"]]) {
  const card = page.locator(".card", { hasText: title });
  const source = await card.locator(".badge").getAttribute("data-source").catch(() => null);
  const text = (await card.innerText()).replace(/\s+/g, " ");
  console.log(source === expected ? "ok  " : "FAIL", text);
  failed ||= source !== expected;
}
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
await page.close();
await browser.close();
process.exit(failed ? 1 : 0);
