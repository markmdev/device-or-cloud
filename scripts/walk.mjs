// Walks the judge's path on the live site in a Chrome that already has the built-in model.
// CDP=http://127.0.0.1:<port> [SITE=https://...] [APPCHECK_DEBUG_TOKEN=...] [SHOTS=<folder>] node scripts/walk.mjs
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const site = process.env.SITE ?? "https://device-or-cloud.web.app";
// The mode each shop feature has in Chrome, where the walk runs: the template's value for Chrome on the web, or its default.
const template = JSON.parse(readFileSync("remoteconfig.template.json", "utf8"));
const modes = Object.entries(template.parameters).map(([key, p]) => [key.replace("mode_", ""), (p.conditionalValues?.["Chrome on the web"] ?? p.defaultValue).value]);
const browser = await chromium.connectOverCDP(process.env.CDP);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
if (process.env.APPCHECK_DEBUG_TOKEN) await context.addInitScript((token) => { self.FIREBASE_APPCHECK_DEBUG_TOKEN = token; }, process.env.APPCHECK_DEBUG_TOKEN);
const page = await context.newPage();
page.on("pageerror", (e) => console.log("page crashed:", String(e).slice(0, 300)));

let failed = 0;
const expect = (ok, what) => { console.log(ok ? "ok  " : "FAIL", what); if (!ok) failed++; };
// What the page shows once it has settled: a move across the line is animated, so the words follow a moment later.
const settles = (check) => page.waitForFunction(check, null, { timeout: 5000 }).then(() => true, () => false);
const shot = (name) => process.env.SHOTS && page.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true });

// The check: the recorded verdicts, the proof, the bottom line and its controls.
await page.goto(site);
await page.locator(".sides").waitFor();
expect(/Recorded on our laptop.*, Chrome \d+, \d+ \w+ 20\d\d/.test(await page.locator("header").innerText()), "the check says where and when it was recorded");
expect((await page.locator(".feature").count()) === modes.length, `all ${modes.length} features have a verdict`);
const onDevice = modes.filter(([, mode]) => mode === "prefer_on_device").length;
expect((await page.locator(".sides .device .feature").count()) === onDevice, `${onDevice} features are on the device side, as published`);
expect((await page.locator(".bottom h2").innerText()).includes(`${onDevice} of the shop's ${modes.length} AI features`), "the bottom line counts the same");
await page.getByLabel("Wrong answers allowed in 100").press("Home");
expect(await settles(() => document.querySelector(".bottom h2").innerText.startsWith("With no wrong answers allowed")), "the bar moves the verdicts and the headline names it");
for (let i = 0; i < 10; i++) await page.getByLabel("Wrong answers allowed in 100").press("ArrowRight");
expect(await settles(() => document.querySelector(".bottom h2").innerText.startsWith("At up to 1 wrong answer in 10")), "ten steps up, the headline names the default bar again");
expect((await page.locator(".sides .device .feature").count()) === onDevice, "back at the default bar, the published split shows again");
expect((await page.locator(".proof pre").count()) === 1, "a failure is shown with its input and both answers");
await shot("check");

// The iPhone view: the same board on Apple's model, split as the template has it for the iPhone app.
const onIphone = Object.values(template.parameters).filter((p) => (p.conditionalValues?.["The iPhone app"] ?? p.defaultValue).value === "prefer_on_device").length;
await page.getByRole("button", { name: "The iPhone app" }).click();
expect(await settles(() => document.querySelector(".bottom h2").innerText.includes("iPhones")), "the iPhone view speaks of the shop's iPhone users");
expect((await page.locator(".sides .device .feature").count()) === onIphone, `${onIphone} features are on the device side in the iPhone app, as published`);
await shot("check-iphone");
await page.getByRole("button", { name: "Chrome on the web" }).click();
expect(await settles(() => !document.querySelector(".bottom h2").innerText.includes("iPhones")), "back on Chrome, the board is Chrome's again");

// Apply it: the page hands over the same Remote Config template the shop was deployed with.
await page.locator(".apply summary").click();
expect(JSON.stringify(JSON.parse(await page.locator(".apply pre").first().innerText())) === JSON.stringify(template), "apply: at the default bar the template shown is the one the shop runs on");
const appCode = await page.locator(".apply pre").nth(1).innerText();
expect(modes.every(([id]) => appCode.includes(`mode_${id}:`)), "apply: the app code names every feature's parameter");
expect(/onDeviceParams/.test(appCode) && modes.every(([id]) => appCode.includes(`model(\n  "mode_${id}",\n  "`)), "apply: the app code gives every feature its instruction on the device side too");
expect(/firebase deploy --only remoteconfig/.test(await page.locator(".apply pre").last().innerText()), "apply: the deploy command is given");
expect(/Nothing on this page writes to your Firebase project/.test(await page.locator(".apply").innerText()), "apply: it says nothing is written to the reader's project");

// A feature kept in the cloud: the recorded one-line fixes, and a line of the reader's own on Chrome's model.
expect(/after one added line in its prompt/.test(await page.locator(".bottom h2").innerText()), "the bottom line counts what one added line moves");
await page.locator(".sides .cloud .feature", { hasText: "Read a review's mood" }).click();
expect((await page.locator('.fixes .fix[data-moved="true"] blockquote').count()) > 0, "a recorded line moves the mood feature, shown with its counts");
await page.getByRole("button", { name: "Run Chrome's model with this line" }).click();
await page.locator(".fix.yours p", { hasText: /On the check's \d+ inputs/ }).waitFor({ timeout: 600_000 }).catch(() => {});
expect((await page.locator(".fix.yours p", { hasText: /On the check's \d+ inputs/ }).count()) === 1, "a line of the reader's own runs on this computer and gets its counts");
await shot("fixes");

// Run it here: Chrome's model answers live, then stop.
await page.getByRole("button", { name: "Run it on your own computer" }).click();
await page.getByRole("button", { name: /Stop · .+: [1-9]/ }).waitFor({ timeout: 120_000 });
expect(true, "the device side reruns on this computer");
await page.getByRole("button", { name: /Stop/ }).click();
await page.getByRole("button", { name: "Run it on your own computer" }).waitFor({ timeout: 60_000 });

// The results page: the whole record, linked from the check, with the counts the shop's template was written from.
await page.getByRole("link", { name: "Every input and every answer of this record" }).click();
await page.locator(".feature-results").first().waitFor();
const record = JSON.parse(readFileSync("src/check/recorded.json", "utf8"));
const inputs = Object.values(record.features).reduce((n, cases) => n + Object.keys(cases).length, 0) + Object.values(record.held).reduce((n, cases) => n + Object.keys(cases).length, 0);
expect((await page.locator(".feature-results > .result").count()) === inputs, `results: all ${inputs} inputs are shown with their answers`);
expect((await page.locator("header").innerText()).includes(`Recorded on ${record.machine}, Chrome ${record.chrome}`), "results: the machine and Chrome's version are given");
const summary = await page.locator(".summary table").innerText();
expect(Object.values(template.parameters).every((p) => summary.replace(/\s+/g, " ").includes(/got (\d+ of \d+) inputs right/.exec(p.description)[1])), "results: each feature's count is the one its Remote Config mode was set from");
expect((await page.locator('.result .given[data-ok="false"]').count()) > 100, "results: the wrong answers are there too");
await shot("results");

// Check your own prompts: a feature pasted by hand, more inputs written by the cloud model, then its verdict.
// This part uses about 30 of the day's free cloud requests.
const own = {
  name: "Sort a message to the front desk",
  system:
    "You sort messages sent to the front desk of Alder Street Dental, a dental practice. Reply with the one thing the patient wants. book: a new appointment or a check-up. change: moving or cancelling an appointment they already have. bill: charges, payments, insurance and receipts. urgent: pain, swelling, bleeding or a broken tooth that can't wait. other: anything else.",
  shape: { type: "object", properties: { label: { type: "string", enum: ["book", "change", "bill", "urgent", "other"] } }, required: ["label"], additionalProperties: false },
  inputs: [
    ["Hi, I'd like to come in for a check-up some time next week, mornings are best.", "book"],
    ["I can't make Thursday at 3 any more. Could we move it to the week after?", "change"],
    ["My crown fell out at dinner and the tooth underneath is throbbing. Can someone see me today?", "urgent"],
  ],
};
await page.goto(`${site}/own/`);
await page.getByLabel("What the feature does").fill(own.name);
await page.getByLabel("The instruction your app sends").fill(own.system);
await page.getByLabel("The answer's shape").fill(JSON.stringify(own.shape));
for (const [i, [input, label]] of own.inputs.entries()) {
  const row = page.locator('.own-input[data-by="you"]').nth(i);
  await row.locator("textarea").nth(0).fill(input);
  await row.locator("textarea").nth(1).fill(JSON.stringify({ label }));
}
expect(/may use what is sent/.test(await page.locator("main > .notice").first().innerText()), "own: the page says pasted prompts may be used by Google");
await page.getByRole("button", { name: /Have the cloud model write/ }).click();
await page.locator('.own-input[data-by="cloud"]').first().waitFor({ timeout: 180_000 }).catch(() => {});
const written = await page.locator('.own-input[data-by="cloud"]').count();
expect(written >= 20, `own: the cloud model wrote ${written} more inputs from three`);
for (let i = 0; i < written; i++) await page.locator('.own-input[data-by="cloud"] input[type=checkbox]').nth(i).check();
await page.getByRole("button", { name: "Run the check" }).click();
const decided = page.locator('.board .feature:is([data-verdict="device"], [data-verdict="cloud"], [data-verdict="fix"])');
await decided.waitFor({ timeout: 900_000 }).catch(() => {});
expect((await decided.count()) === 1, "own: the pasted feature gets its verdict");
if (!(await decided.count())) console.log("     the page says:", (await page.locator("main > .notice").allInnerTexts()).join(" | ").slice(0, 400));
expect(/this feature/.test(await page.locator(".bottom h2").innerText().catch(() => "")), "own: the bottom line speaks of the one feature");
expect(/inputs have a right answer, and code compared/.test(await page.locator("footer").innerText().catch(() => "")), "own: the page says how the answers were judged");
await page.locator(".apply summary").click().catch(() => {});
const ownMode = JSON.parse(await page.locator(".apply pre").first().innerText().catch(() => "{}")).parameters?.mode_sort_a_message_to_the_front_desk;
const ownVerdict = await decided.getAttribute("data-verdict").catch(() => null);
expect(!!ownMode && Boolean(ownMode.conditionalValues) === (ownVerdict === "device"), "own: the pasted feature's template moves it to the device only if its verdict does");
await shot("own");

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
// The results page's row styles once reached the cards' answers and squeezed each into a column 110 px wide.
const [answer, wholeCard] = await Promise.all([page.locator(".card .result").first().boundingBox(), page.locator(".card").first().boundingBox()]);
expect(answer.width > wholeCard.width * 0.8, "shop: an answer has its card's full width");
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
