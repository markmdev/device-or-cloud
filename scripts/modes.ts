// Turns the recorded check's verdicts, at the default bar, into the shop's Remote Config template: one mode for each feature.
import { readFileSync, writeFileSync } from "node:fs";
import { TEMPLATE_FILE, templateText } from "../src/check/apply";
import { modeFor, VERDICT_NAME, verdictFor, verdictLine, type CheckRecord } from "../src/check/record";
import { FEATURES } from "../src/features";

const record: CheckRecord = JSON.parse(readFileSync("src/check/recorded.json", "utf8"));
const verdicts = FEATURES.map((f) => verdictFor(f, record.features[f.id]));
for (const v of verdicts) console.log(`${v.feature.name}: ${VERDICT_NAME[v.kind]} ${verdictLine(v)} -> ${modeFor(v)}`);
writeFileSync(TEMPLATE_FILE, templateText(verdicts));
