// The check as the iPhone app runs it. `npm run ios` builds this file into one script the app loads, so the app judges
// Apple's answers with the same code and the same recorded cloud answers as the web check.
import { FEATURES } from "../features";
import { parse } from "../features/types";
import { BATCH, GRADER, gradingPrompt, readGrades, ungraded, withGrades } from "./grade";
import recorded from "./recorded.json";
import { DEFAULT_ALLOWED, graded, onApple, RUNS, VERDICT_NAME, verdictFor, type Cases, type CheckRecord, type Grades, type Run } from "./record";

const RECORD = recorded as CheckRecord;

/** What this iPhone has answered itself: for each feature, each input's runs on Apple's model and the grader's word on them. */
type Mine = Record<string, Record<string, { apple: Run[]; grades?: Grades }>>;

const feature = (id: string) => FEATURES.find((f) => f.id === id)!;
const complete = (id: string, mine: Mine) => feature(id).cases.every((c) => mine[id]?.[c.id]?.apple.length === RUNS);

/** A feature's answers: the recorded ones, with this iPhone's own in Apple's place once it has run every input. */
function casesOf(id: string, mine: Mine): Cases {
  const base = RECORD.features[id] ?? {};
  if (!complete(id, mine)) return base;
  return Object.fromEntries(
    feature(id).cases.map((c) => [c.id, { ...base[c.id], apple: mine[id][c.id].apple, grades: { ...base[c.id]?.grades, ...mine[id][c.id].grades } }]),
  );
}

const textOf = (run?: Run) => (run && "text" in run ? run.text : run?.error);

/** An answer as the phone shows it: a JSON object as one line for each field, anything else as it is. */
function shown(run?: Run): string {
  const text = textOf(run) ?? "", object = parse(text);
  return object ? Object.entries(object).map(([key, value]) => `${key}: ${String(value) || "(empty)"}`).join("\n") : text;
}

/** Every feature's verdict at the default bar, with its counts and its wrong answers. */
export function board(mineJson: string): string {
  const mine: Mine = JSON.parse(mineJson);
  return JSON.stringify({
    allowed: DEFAULT_ALLOWED,
    recorded: RECORD.apple,
    features: FEATURES.map((f) => {
      const cases = casesOf(f.id, mine);
      const v = verdictFor(f, onApple(cases));
      return {
        id: f.id,
        name: f.name,
        kind: v.kind,
        verdict: VERDICT_NAME[v.kind],
        mine: complete(f.id, mine),
        inputs: v.inputs,
        runs: v.runs,
        runsRight: v.runsRight,
        cloudRight: v.cloudRight,
        failures: v.failures.map((x) => {
          const r = cases[x.c.id], worst = Math.max(0, x.device.findIndex((d) => !d.ok)), device = x.device[worst];
          return {
            id: x.c.id,
            input: x.c.input,
            side: x.side,
            answer: shown(r.apple?.[worst]),
            wrongRuns: x.device.filter((d) => !d.ok).length,
            cloudAnswer: shown(r.cloud),
            reason: !device.ok ? device.reason : x.cloud && !x.cloud.ok ? x.cloud.reason : "",
            byCode: !graded(f, x.c) || !f.check(textOf(r.apple?.[worst]) ?? "", x.c).ok,
          };
        }),
      };
    }),
  });
}

/** The requests that have the cloud model judge this iPhone's free-text answers: at most one for each batch of a feature. */
export function grading(mineJson: string): string {
  const mine: Mine = JSON.parse(mineJson);
  return JSON.stringify(
    FEATURES.filter((f) => complete(f.id, mine)).flatMap((f) => {
      const items = ungraded(f, casesOf(f.id, mine));
      return Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) => items.slice(i * BATCH, (i + 1) * BATCH)).map((batch) => ({
        feature: f.id,
        system: GRADER.system,
        prompt: gradingPrompt(f, batch),
        items: batch.map(({ id, answer }) => ({ id, answer })),
      }));
    }),
  );
}

/** This iPhone's answers with the grader's reply to one of those requests put in. */
export function withReply(mineJson: string, featureId: string, itemsJson: string, reply: string): string {
  const mine: Mine = JSON.parse(mineJson), items: { id: string; answer: string }[] = JSON.parse(itemsJson);
  const next = withGrades(mine[featureId] as unknown as Cases, items, readGrades(reply, items.length));
  return JSON.stringify({ ...mine, [featureId]: next });
}
