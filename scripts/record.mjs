// Makes the recorded check: drives the dev page's "Record everything" in a Chrome that has the built-in model.
// Start `npx vite` first. CDP=http://127.0.0.1:<port> node scripts/record.mjs
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP(process.env.CDP);
const page = await browser.contexts()[0].newPage();
page.on("console", (m) => m.type() === "error" && console.log("page error:", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("page crashed:", String(e).slice(0, 300)));
await page.goto(process.env.SITE ?? "http://127.0.0.1:5173/");
// The run goes on from record.partial.json when a run cut short left one, and from the last record otherwise, so only
// what is missing is asked. REDO=<feature id>,... records those features again from nothing.
// REGRADE=<feature id>,... keeps their answers and asks the cloud model to judge them again.
const RECORD = "src/check/recorded.json", PARTIAL = "record.partial.json";
const kept = JSON.parse(readFileSync(existsSync(PARTIAL) ? PARTIAL : RECORD, "utf8"));
for (const id of process.env.REDO?.split(",") ?? []) delete kept.features[id];
for (const id of process.env.REGRADE?.split(",") ?? []) for (const c of Object.values(kept.features[id])) delete c.grades;
await page.evaluate((partial) => sessionStorage.setItem("partial", partial), JSON.stringify({ features: kept.features, held: kept.held, fixes: kept.fixes }));
// The page reports what it measured; the rest of the record, such as where Apple's runs were made, stays as it was.
const save = (file, measured) => writeFileSync(file, JSON.stringify({ ...kept, ...JSON.parse(measured) }, null, 1) + "\n");
await page.getByRole("button", { name: "Record everything" }).click();

let last = "";
for (;;) {
  const state = await page.evaluate(() => ({
    record: sessionStorage.getItem("record"),
    partial: sessionStorage.getItem("partial"),
    at: document.querySelector("header button")?.textContent ?? "",
  }));
  if (state.partial) save(PARTIAL, state.partial);
  if (state.record) {
    save(RECORD, state.record);
    rmSync(PARTIAL, { force: true });
    console.log("recorded");
    break;
  }
  if (state.at !== last) console.log(new Date().toTimeString().slice(0, 8), (last = state.at));
  if (!state.at.startsWith("Stop")) {
    console.log("the run stopped before the end; what it has is in record.partial.json");
    process.exitCode = 1;
    break;
  }
  await page.waitForTimeout(5000);
}
await browser.close();
