// Makes the recorded check: drives the dev page's "Record everything" in a Chrome that has the built-in model.
// Start `npx vite` first. CDP=http://127.0.0.1:<port> node scripts/record.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP(process.env.CDP);
const page = await browser.contexts()[0].newPage();
page.on("console", (m) => m.type() === "error" && console.log("page error:", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("page crashed:", String(e).slice(0, 300)));
await page.goto(process.env.SITE ?? "http://127.0.0.1:5173/");
// REDO=<feature id>,... records those features again and keeps the rest of the last record.
// REGRADE=<feature id>,... keeps their answers and asks the cloud model to judge them again.
if (process.env.REDO || process.env.REGRADE) {
  const kept = JSON.parse(readFileSync("src/check/recorded.json", "utf8")).features;
  for (const id of process.env.REDO?.split(",") ?? []) delete kept[id];
  for (const id of process.env.REGRADE?.split(",") ?? []) for (const c of Object.values(kept[id])) delete c.grades;
  await page.evaluate((partial) => sessionStorage.setItem("partial", partial), JSON.stringify(kept));
}
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
