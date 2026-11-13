import type { Case, Check, Feature } from "../features";

export const RUNS = 3;

export type Run = { text: string; seconds: number } | { error: string };
export type CloudRun = Run & { tokensIn?: number; tokensOut?: number };

/** What the cloud grader said about one answer of a graded feature, keyed by the answer's text. */
export type Grades = Record<string, Check>;

export type CaseRecord = { device: Run[]; cloud?: CloudRun; grades?: Grades };

export type CheckRecord = {
  machine: string;
  chrome: string;
  date: string;
  cloudModel: string;
  features: Record<string, Record<string, CaseRecord>>;
};

/** Code decides first; the grader's word counts only where code found nothing wrong. */
export function judge(feature: Feature, c: Case, run: Run | undefined, grades?: Grades): Check | undefined {
  if (!run) return undefined;
  if ("error" in run) return { ok: false, reason: run.error };
  const byCode = feature.check(run.text, c);
  if (!byCode.ok || !feature.graded) return byCode;
  return grades?.[run.text];
}

export type Failure = { c: Case; side: "device" | "cloud" | "both"; device: Check[]; cloud?: Check };

export type Verdict = {
  feature: Feature;
  /** device: move it. cloud: keep it. fix: the cloud is wrong too. more: too few inputs. pending: not all answers are in. */
  kind: "device" | "cloud" | "fix" | "more" | "pending";
  inputs: number;
  deviceRight: number;
  cloudRight: number;
  failures: Failure[];
  /** What the failing inputs have in common, when they all share it. */
  pattern?: string;
  deviceSeconds?: number;
  /** Measured tokens of one cloud request, averaged. */
  tokensIn?: number;
  tokensOut?: number;
};

export const ENOUGH_INPUTS = 20;

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export function verdictFor(feature: Feature, cases: Record<string, CaseRecord> = {}): Verdict {
  let deviceRight = 0, cloudRight = 0, pending = false;
  const failures: Failure[] = [];
  const seconds: number[] = [], tokensIn: number[] = [], tokensOut: number[] = [];
  for (const c of feature.cases) {
    const r = cases[c.id];
    const device = Array.from({ length: RUNS }, (_, i) => judge(feature, c, r?.device[i], r?.grades));
    const cloud = judge(feature, c, r?.cloud, r?.grades);
    if (device.includes(undefined) || !cloud) { pending = true; continue; }
    const deviceOk = (device as Check[]).every((d) => d.ok);
    if (deviceOk) deviceRight++;
    if (cloud.ok) cloudRight++;
    if (!deviceOk || !cloud.ok) failures.push({ c, side: deviceOk ? "cloud" : cloud.ok ? "device" : "both", device: device as Check[], cloud });
    for (const run of r.device) if ("seconds" in run) seconds.push(run.seconds);
    if (r.cloud?.tokensIn != null) { tokensIn.push(r.cloud.tokensIn); tokensOut.push(r.cloud.tokensOut ?? 0); }
  }
  const inputs = feature.cases.length;
  const kinds = new Set(failures.filter((f) => f.side !== "cloud").map((f) => f.c.kind));
  return {
    feature,
    kind: pending ? "pending" : inputs < ENOUGH_INPUTS ? "more" : cloudRight < inputs ? "fix" : deviceRight === inputs ? "device" : "cloud",
    inputs,
    deviceRight,
    cloudRight,
    failures,
    pattern: kinds.size === 1 ? [...kinds][0] : undefined,
    deviceSeconds: seconds.length ? median(seconds) : undefined,
    tokensIn: tokensIn.length ? mean(tokensIn) : undefined,
    tokensOut: tokensOut.length ? mean(tokensOut) : undefined,
  };
}

/** The Remote Config value each verdict sets. */
export const modeFor = (v: Verdict) => (v.kind === "device" ? "prefer_on_device" : "only_in_cloud");

export function verdictLine(v: Verdict): string {
  const wrong = v.inputs - v.deviceRight;
  switch (v.kind) {
    case "device": return `Right on ${v.deviceRight} of ${v.inputs}, every run.`;
    case "cloud": return `Wrong on ${wrong} of ${v.inputs}${v.pattern ? `, ${wrong === 1 ? "one of the" : "all"} ${v.pattern}` : ""}.`;
    case "fix": return `The cloud gets ${v.inputs - v.cloudRight} of ${v.inputs} wrong too; the device, ${wrong}.`;
    case "more": return `Add ${ENOUGH_INPUTS - v.inputs} more.`;
    case "pending": return "Not run yet.";
  }
}

export const VERDICT_NAME: Record<Verdict["kind"], string> = {
  device: "Runs on the device.",
  cloud: "Keep in the cloud.",
  fix: "Fix the prompt first.",
  more: "Not enough inputs to tell.",
  pending: "Waiting for answers.",
};

// gemini-3.5-flash-lite's published price in US dollars per million tokens, read on 13 November 2026.
const PRICE_IN = 0.3, PRICE_OUT = 2.5;

export const dollarsPerRequest = (v: Verdict) => ((v.tokensIn ?? 0) * PRICE_IN + (v.tokensOut ?? 0) * PRICE_OUT) / 1_000_000;
