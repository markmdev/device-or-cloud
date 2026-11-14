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
const kept = JSON.parse(readFileSync(existsSync("record.partial.json") ? "record.partial.json" : "src/check/recorded.json", "utf8"));
for (const id of process.env.REDO?.split(",") ?? []) delete kept.features[id];
for (const id of process.env.REGRADE?.split(",") ?? []) for (const c of Object.values(kept.features[id])) delete c.grades;
await page.evaluate((partial) => sessionStorage.setItem("partial", partial), JSON.stringify({ features: kept.features, held: kept.held, fixes: kept.fixes }));
await page.getByRole("button", { name: "Record everything" }).click();

let last = "";
for (;;) {
  const state = await page.evaluate(() => ({
    record: sessionStorage.getItem("record"),
    partial: sessionStorage.getItem("partial"),
    at: document.querySelector("header button")?.textContent ?? "",
  }));
  if (state.partial) writeFileSync("record.partial.json", state.partial);
  if (state.record) {
    writeFileSync("src/check/recorded.json", JSON.stringify(JSON.parse(state.record), null, 1) + "\n");
    rmSync("record.partial.json", { force: true });
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
