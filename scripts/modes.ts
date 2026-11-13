// Turns the recorded check's verdicts, at the default bar, into the shop's Remote Config template: one mode for each feature.
import { readFileSync, writeFileSync } from "node:fs";
import { modeFor, VERDICT_NAME, verdictFor, verdictLine, type CheckRecord } from "../src/check/record";
import { FEATURES } from "../src/features";

const record: CheckRecord = JSON.parse(readFileSync("src/check/recorded.json", "utf8"));
const parameters = Object.fromEntries(
  FEATURES.map((f) => {
    const v = verdictFor(f, record.features[f.id]);
    console.log(`${f.name}: ${VERDICT_NAME[v.kind]} ${verdictLine(v)} -> ${modeFor(v)}`);
    return [`mode_${f.id}`, { defaultValue: { value: modeFor(v) }, description: `${f.name}. ${VERDICT_NAME[v.kind]} ${verdictLine(v)}`, valueType: "STRING" }];
  }),
);
writeFileSync("remoteconfig.template.json", JSON.stringify({ parameters }, null, 2) + "\n");
