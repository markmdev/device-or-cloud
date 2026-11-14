// Puts Apple's column into the record: the answers the iPhone app made when started with -record, and the cloud model's
// judgments of them. npm run apple -- <the app's check.json>, then GRADE=1 node scripts/record.mjs for what is left to judge.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import type { CheckRecord, Grades, Run } from "../src/check/record";
import { FEATURES } from "../src/features";

const FILE = "src/check/recorded.json";
const app: { device: string; os: string; date: string; answers: Record<string, Record<string, { apple: Run[]; grades?: Grades }>> } = JSON.parse(
  readFileSync(process.argv[2], "utf8"),
);
const record: CheckRecord = JSON.parse(readFileSync(FILE, "utf8"));

// The simulator answers with the model of the Mac it runs on.
const host = `macOS ${execFileSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).trim()}`;
record.apple = { device: app.device, os: app.os, host, date: app.date };
for (const f of FEATURES) {
  for (const [cases, into] of [[f.cases, record.features], [f.heldBack ?? [], (record.held ??= {})]] as const) {
    for (const c of cases) {
      const mine = app.answers[f.id]?.[c.id];
      if (!mine) continue;
      const kept = ((into[f.id] ??= {})[c.id] ??= { device: [] });
      kept.apple = mine.apple;
      if (mine.grades) kept.grades = { ...kept.grades, ...mine.grades };
    }
  }
}
writeFileSync(FILE, JSON.stringify(record, null, 1) + "\n");
