// Puts Apple's column into the record: the answers the iPhone app made when started with -record.
// npm run apple -- <apple-record.json>, then GRADE=1 node scripts/record.mjs for the answers the cloud model judges.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import type { CheckRecord, Run } from "../src/check/record";

type Runs = Record<string, Record<string, Run[]>>;
const FILE = "src/check/recorded.json";
const apple: { device: string; os: string; date: string; features: Runs; held: Runs } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const record: CheckRecord = JSON.parse(readFileSync(FILE, "utf8"));

// The simulator answers with the model of the Mac it runs on.
const host = `macOS ${execFileSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).trim()}`;
record.apple = { device: apple.device, os: apple.os, host, date: apple.date };
for (const [from, into] of [[apple.features, record.features], [apple.held, (record.held ??= {})]] as const) {
  for (const [feature, cases] of Object.entries(from)) {
    for (const [id, runs] of Object.entries(cases)) ((into[feature] ??= {})[id] ??= { device: [] }).apple = runs;
  }
}
writeFileSync(FILE, JSON.stringify(record, null, 1) + "\n");
