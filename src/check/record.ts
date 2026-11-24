import type { Case, Check, Feature } from "../features";
import { parse, plain } from "../features/types";

export const RUNS = 3;

export type Run = { text: string; seconds: number } | { error: string };
export type CloudRun = Run & { tokensIn?: number; tokensOut?: number };

/** What the cloud grader said about one answer of a graded feature, keyed by the answer's text. */
export type Grades = Record<string, Check>;

/** `device` holds the runs on Chrome's model; `apple`, the runs on Apple's model from the iPhone app. */
export type CaseRecord = {
  device: Run[];
  apple?: Run[];
  cloud?: CloudRun;
  grades?: Grades;
  /** The second grader's judgment of the same answers. The verdicts never read it. */
  second?: Grades;
};

/** One line added to a feature's instruction, and how both sets of inputs went with it. */
export type FixRecord = {
  line: string;
  /** Who wrote it: the cloud model from the failures, us after reading them, or the developer checking their own feature. */
  by: "cloud" | "us" | "you";
  /** Set when the line was tried on Apple's model in the iPhone app; `device` in its answers then holds Apple's runs. */
  on?: "apple";
  /** A setting in place of a line: Apple's model with its randomness off, so it always gives its most likely answer. */
  steady?: boolean;
  /** The check's own inputs with the line, on the device. */
  cases: Record<string, CaseRecord>;
  /** The held-back inputs with the line, on the device and in the cloud. */
  held: Record<string, CaseRecord>;
};

export type CheckRecord = {
  machine: string;
  chrome: string;
  date: string;
  cloudModel: string;
  /** The model that judged the judged answers a second time, once it has. */
  secondGrader?: string;
  /** Where Apple's runs were made. */
  apple?: { device: string; os: string; host: string; date: string };
  again?: { chrome: string; date: string; cases: string[] };
  features: Record<string, Record<string, CaseRecord>>;
  /** The held-back inputs as the instruction stands, by feature. */
  held?: Record<string, Record<string, CaseRecord>>;
  fixes?: Record<string, FixRecord[]>;
};

export type Cases = Record<string, CaseRecord>;

/** The same answers as the iPhone app has them: Apple's runs in the place of Chrome's, so every count and verdict is the iPhone's. */
export const onApple = (cases: Cases = {}): Cases => Object.fromEntries(Object.entries(cases).map(([id, r]) => [id, { ...r, device: r.apple ?? [] }]));

/** A date of the record as the pages write it: 14 November 2026. */
export const written = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const recordedOn = (r: CheckRecord, date = written) =>
  `Recorded on ${r.machine}, Chrome ${r.chrome}, ${date(r.date)}${r.again ? `; ${r.again.cases.length} inputs again on Chrome ${r.again.chrome}, ${date(r.again.date)}` : ""}`;

/** Where Apple's runs were made, in a sentence. */
export const whereApple = (a: NonNullable<CheckRecord["apple"]>) =>
  `Apple's model was run from the iPhone app in the ${a.device}, iOS ${a.os}, on ${written(a.date)}; the simulator answers with the model of the Mac it runs on, ${a.host}.`;

/** The fields in which two answers differ: what a reader should look at first. */
export function differing(a?: string, b?: string): string[] {
  const one = a ? parse(a) : null, other = b ? parse(b) : null;
  if (!one || !other) return [];
  return Object.keys(one).filter((key) => plain(one[key]) !== plain(other[key]));
}

/** Whether the cloud grader has a say on this input's answers. */
export const graded = (feature: Feature, c: Case) => !!feature.graded && !c.codeDecides;

/** Code decides first; the grader's word counts only where code found nothing wrong. */
export function judge(feature: Feature, c: Case, run: Run | undefined, grades?: Grades): Check | undefined {
  if (!run) return undefined;
  if ("error" in run) return { ok: false, reason: run.error };
  const byCode = feature.check(run.text, c);
  if (!byCode.ok || !graded(feature, c)) return byCode;
  return grades?.[run.text];
}

export type Failure = { c: Case; side: "device" | "cloud" | "both"; device: Check[]; cloud?: Check };

/** Wrong answers in 100 that a count allows: the 95% range around what was measured. */
export type Range = { low: number; high: number };

/**
 * The range for `wrong` wrong inputs out of `of` (Wilson's interval). An input the model gets wrong on some runs only
 * counts as that part of an input, so the three runs of one input never pass for three measurements.
 */
export function rangeOf(wrong: number, of: number): Range {
  const z = 1.96, p = wrong / of, scale = 1 + (z * z) / of;
  const centre = (p + (z * z) / (2 * of)) / scale, half = (z * Math.sqrt((p * (1 - p)) / of + (z * z) / (4 * of * of))) / scale;
  return { low: Math.max(0, centre - half) * 100, high: Math.min(1, centre + half) * 100 };
}

const crosses = (r: Range, allowed: number) => r.low <= allowed && r.high > allowed;

/**
 * The range a line's or a setting's count on the check's inputs allows, as for a verdict, and whether it crosses the bar.
 * None until the on-device model has answered with it.
 */
export function fixRange(feature: Feature, fix: { cases: Record<string, CaseRecord> }, allowed: number): { range: Range; unsure: boolean } | undefined {
  const t = tally(feature, fix.cases);
  if (!t.inputs) return undefined;
  const range = rangeOf((t.runs - t.runsRight) / RUNS, t.inputs);
  return { range, unsure: crosses(range, allowed) };
}

/** How many more inputs, at the same rate, until the range is clear of the bar; none when that takes more than 200. */
function moreToTell(wrong: number, of: number, allowed: number): number | undefined {
  for (let n = of + 10; n <= of + 200; n += 10) if (!crosses(rangeOf((wrong / of) * n, n), allowed)) return n - of;
}

export type Verdict = {
  feature: Feature;
  /** device: move it. cloud: keep it. fix: neither model is good enough. more: too few inputs. pending: not all answers are in. */
  kind: "device" | "cloud" | "fix" | "more" | "pending";
  inputs: number;
  /** Inputs the on-device model got right on every run. */
  inputsRight: number;
  /** Device answers given, and how many were right. */
  runs: number;
  runsRight: number;
  cloudRight: number;
  /** What each model's count allows. */
  range: Range;
  cloudRange: Range;
  /**
   * Set when the on-device model's range crosses the bar, so more inputs could change whether the feature can run on the
   * device: about how many more would settle it (none: more than 200).
   */
  unsure?: { more?: number };
  failures: Failure[];
  /** What the failing inputs have in common, when they all share it. */
  pattern?: string;
};

/** Right answers among those given so far, for each model. `inputsRight` are the inputs the on-device model got right on every run. */
export type Tally = { inputs: number; inputsRight: number; runs: number; runsRight: number; cloud: number; cloudRight: number };

export function tally(feature: Feature, cases: Record<string, CaseRecord> = {}, inputs = feature.cases): Tally {
  const t: Tally = { inputs: 0, inputsRight: 0, runs: 0, runsRight: 0, cloud: 0, cloudRight: 0 };
  for (const c of inputs) {
    const r = cases[c.id];
    const device = (r?.device ?? []).flatMap((run) => judge(feature, c, run, r.grades) ?? []);
    t.runs += device.length;
    t.runsRight += device.filter((d) => d.ok).length;
    if (device.length) t.inputs++;
    if (device.length && device.every((d) => d.ok)) t.inputsRight++;
    const cloud = judge(feature, c, r?.cloud, r?.grades);
    if (cloud) { t.cloud++; if (cloud.ok) t.cloudRight++; }
  }
  return t;
}

export const within = (right: number, of: number, allowed: number) => (of - right) * 100 <= allowed * of;

/**
 * A line moves a feature when Chrome's model stays within the bar with it on the check's inputs and on the held-back ones,
 * and the cloud model stays within it on the held-back ones.
 */
export const moves = (feature: Feature, fix: FixRecord, allowed: number) => !shortOn(feature, fix, allowed);

/** Where a line falls short: answers still missing, the check's inputs, the held-back ones, or the cloud model on those. */
export function shortOn(feature: Feature, fix: FixRecord, allowed: number): "answers" | "check" | "held" | "cloud" | undefined {
  const held = feature.heldBack ?? [];
  const own = tally(feature, fix.cases), kept = tally(feature, fix.held, held);
  if (own.runs !== feature.cases.length * RUNS || kept.runs !== held.length * RUNS || kept.cloud !== held.length) return "answers";
  if (!within(own.runsRight, own.runs, allowed)) return "check";
  if (!within(kept.runsRight, kept.runs, allowed)) return "held";
  if (!within(kept.cloudRight, kept.cloud, allowed)) return "cloud";
}

export const ENOUGH_INPUTS = 20;
/** Wrong answers allowed in 100 before a model is not good enough for a feature. */
export const DEFAULT_ALLOWED = 10;

export function verdictFor(feature: Feature, cases: Record<string, CaseRecord> = {}, allowed = DEFAULT_ALLOWED): Verdict {
  let runsRight = 0, inputsRight = 0, cloudRight = 0, pending = false;
  const failures: Failure[] = [];
  for (const c of feature.cases) {
    const r = cases[c.id];
    const device = Array.from({ length: RUNS }, (_, i) => judge(feature, c, r?.device[i], r?.grades));
    const cloud = judge(feature, c, r?.cloud, r?.grades);
    if (device.includes(undefined) || !cloud) { pending = true; continue; }
    const deviceOk = (device as Check[]).every((d) => d.ok);
    runsRight += (device as Check[]).filter((d) => d.ok).length;
    if (deviceOk) inputsRight++;
    if (cloud.ok) cloudRight++;
    if (!deviceOk || !cloud.ok) failures.push({ c, side: deviceOk ? "cloud" : cloud.ok ? "device" : "both", device: device as Check[], cloud });
  }
  const inputs = feature.cases.length;
  const runs = inputs * RUNS;
  const kinds = new Set(failures.filter((f) => f.side !== "cloud").map((f) => f.c.kind));
  const kind = pending ? "pending" : inputs < ENOUGH_INPUTS ? "more" : within(runsRight, runs, allowed) ? "device" : within(cloudRight, inputs, allowed) ? "cloud" : "fix";
  const wrong = (runs - runsRight) / RUNS, cloudWrong = inputs - cloudRight;
  const range = rangeOf(wrong, inputs), cloudRange = rangeOf(cloudWrong, inputs);
  return {
    feature,
    kind,
    inputs,
    inputsRight,
    runs,
    runsRight,
    cloudRight,
    range,
    cloudRange,
    unsure: (kind === "device" || kind === "cloud" || kind === "fix") && crosses(range, allowed) ? { more: moreToTell(wrong, inputs, allowed) } : undefined,
    failures,
    pattern: kinds.size === 1 ? [...kinds][0] : undefined,
  };
}

/** The bar as a developer would say it. */
export function barInWords(allowed: number): string {
  if (allowed === 0) return "With no wrong answers allowed";
  const [count, per] = allowed % 10 === 0 ? [allowed / 10, 10] : [allowed, 100];
  return `At up to ${count} wrong answer${count === 1 ? "" : "s"} in ${per}`;
}

export const CHROMES = "Chrome's model", APPLES = "Apple's model";

export function verdictLine(v: Verdict, who = CHROMES): string {
  const counts = `${who} got ${v.inputsRight} of ${v.inputs} inputs right on every run; the cloud, ${v.cloudRight}.`;
  switch (v.kind) {
    case "device":
    case "fix": return counts;
    case "cloud": return `${counts}${v.pattern ? ` Its misses: ${v.pattern}.` : ""}`;
    case "more": return `Add ${ENOUGH_INPUTS - v.inputs} more.`;
    case "pending": return "Not run yet.";
  }
}

export const UNSURE = "Not enough inputs to tell";

const inWords = (r: Range) => `${Math.round(r.low)} to ${Math.round(r.high)} wrong answers in 100`;

/** A model's count in a sentence: its inputs right on every run, the ones that vary, and the range that allows. */
export function countLine(v: Verdict, who = CHROMES): string {
  if (v.kind === "pending" || v.kind === "more") return verdictLine(v, who);
  const wrongEveryRun = v.failures.filter((f) => f.side !== "cloud" && f.device.every((d) => !d.ok)).length;
  const varies = v.inputs - v.inputsRight - wrongEveryRun;
  return (
    `${who} was right on ${v.inputsRight} of ${v.inputs} inputs on every run, wrong on ${wrongEveryRun} on every run` +
    `${varies ? `, and right on some runs only on ${varies}` : ""}. With ${v.inputs} inputs, that allows ${inWords(v.range)}; the cloud model's ${v.cloudRight} of ${v.inputs}, ${inWords(v.cloudRange)}.`
  );
}

/** Why a verdict could still change, and what would settle it. */
export function unsureLine(v: Verdict, who = CHROMES): string | undefined {
  if (!v.unsure) return undefined;
  const settle = v.unsure.more ? `About ${v.unsure.more} more inputs would settle it.` : "It would take hundreds more inputs to settle it.";
  return `${UNSURE}: ${who}'s range crosses the bar. ${settle}`;
}

/** What moving a feature to the device costs: the inputs the cloud model gets right and the on-device model doesn't. */
export function costLine(v: Verdict): string | undefined {
  const lost = v.failures.filter((f) => f.side === "device");
  if (!lost.length) return undefined;
  const kinds = [...new Set(lost.map((f) => f.c.kind))];
  return `Moving costs ${lost.length} of ${v.inputs} inputs that the cloud gets right${kinds.length <= 2 ? `: ${kinds.join(", and ")}` : ""}.`;
}

export const VERDICT_NAME: Record<Verdict["kind"], string> = {
  device: "Runs on the device.",
  cloud: "Keep in the cloud.",
  fix: "Neither model is good enough.",
  more: "Too few inputs for a verdict.",
  pending: "Waiting for answers.",
};

/** What to do about a feature neither model is good enough for. */
export const NEITHER_ADVICE = "Change the prompt, or don't use a model for this: work it out in code.";

export const NO_TOOLS_ON_DEVICE =
  "On the web, Firebase's SDK hands Chrome's model the messages but not the function's declaration, so on the device the model can only answer in words: a function call needs the cloud.";
