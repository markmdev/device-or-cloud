// Puts Apple's side into the record, and tells the iPhone app what to try next.
// npm run apple -- <the app's check.json> <fixes.json to write>
// The first file is what the app made when started with -record: Apple's answers, and its runs of each line and setting.
// The second lists every line and setting the record wants tried on Apple's model; put it in the app's Documents folder and
// start the app with -record again. Then record once more (scripts/record.mjs) for what the cloud model still has to judge.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { APPLE_LINES, OUR_LINES } from "../src/check/lines";
import type { CheckRecord, FixRecord, Grades, Run } from "../src/check/record";
import { FEATURES } from "../src/features";

type Ask = { feature: string; line: string; by: FixRecord["by"]; steady: boolean };
const FILE = "src/check/recorded.json";
const app: {
  device: string;
  os: string;
  date: string;
  answers: Record<string, Record<string, { apple: Run[]; grades?: Grades }>>;
  fixes?: (Ask & { answers?: Record<string, Run[]> })[];
} = JSON.parse(readFileSync(process.argv[2], "utf8"));
const record: CheckRecord = JSON.parse(readFileSync(FILE, "utf8"));
const same = (fix: FixRecord, ask: Ask) => fix.on === "apple" && fix.line === ask.line && !!fix.steady === ask.steady;

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
  for (const tried of app.fixes?.filter((x) => x.feature === f.id) ?? []) {
    const fixes = ((record.fixes ??= {})[f.id] ??= []);
    let fix = fixes.find((x) => same(x, tried));
    if (!fix) fixes.push((fix = { line: tried.line, by: tried.by, on: "apple", ...(tried.steady && { steady: true }), cases: {}, held: {} }));
    for (const [cases, into] of [[f.cases, fix.cases], [f.heldBack ?? [], fix.held]] as const) {
      for (const c of cases) if (tried.answers?.[c.id]) into[c.id] = { ...into[c.id], device: tried.answers[c.id] };
    }
  }
}
writeFileSync(FILE, JSON.stringify(record, null, 1) + "\n");

const asks: Ask[] = APPLE_LINES.flatMap((id) => [
  { feature: id, line: "", by: "us", steady: true },
  ...(OUR_LINES[id] ? [{ feature: id, line: OUR_LINES[id], by: "us" as const, steady: false }] : []),
  ...(record.fixes?.[id] ?? []).filter((fix) => fix.on === "apple" && fix.by === "cloud").map((fix) => ({ feature: id, line: fix.line, by: fix.by, steady: false })),
]);
writeFileSync(process.argv[3], JSON.stringify(asks, null, 1) + "\n");
