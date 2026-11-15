// Turns the recorded check, at the default bar, into the shop's Remote Config template: each feature's mode on each
// platform, and the line or setting it needs where one moves it to the device.
import { readFileSync, writeFileSync } from "node:fs";
import { CHROME, IPHONE, placedOn, runsOnDevice, TEMPLATE_FILE, templateText } from "../src/check/apply";
import { DEFAULT_ALLOWED, onApple, VERDICT_NAME, verdictFor, type CheckRecord } from "../src/check/record";
import { FEATURES } from "../src/features";

const record: CheckRecord = JSON.parse(readFileSync("src/check/recorded.json", "utf8"));
const verdicts = (apple: boolean) => FEATURES.map((f) => verdictFor(f, apple ? onApple(record.features[f.id]) : record.features[f.id]));
const chrome = placedOn(verdicts(false), record.fixes, false, DEFAULT_ALLOWED);
const apple = record.apple && placedOn(verdicts(true), record.fixes, true, DEFAULT_ALLOWED);
for (const [name, list] of [[CHROME, chrome], [IPHONE, apple ?? []]] as const) {
  for (const p of list) {
    const how = p.fix ? ` with ${p.fix.steady ? "its randomness off" : `the line "${p.fix.line}"`}` : "";
    console.log(`${name}, ${p.verdict.feature.name}: ${VERDICT_NAME[p.verdict.kind]} -> ${runsOnDevice(p) ? "prefer_on_device" : "only_in_cloud"}${how}`);
  }
}
writeFileSync(TEMPLATE_FILE, templateText(chrome, apple));
