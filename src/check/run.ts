import type { Check, Feature } from "../features";
import { ask, CLOUD, DEVICE, OutOfRequests } from "./ask";
import { SECOND_GRADER } from "../firebase";
import { BATCH, GRADER, gradingPrompt, notJudgedTwice, readGrades, ungraded, withGrades } from "./grade";
import { RUNS, type Cases, type Run } from "./record";

export type { Cases };

/** A failed request is an answer of its own, except running out of free requests, which stops the run. */
function failed(e: unknown): Run {
  if (e instanceof OutOfRequests) throw e;
  return { error: e instanceof Error ? e.message : String(e) };
}

/** Runs every input of a feature on Chrome's model, RUNS times each, reporting after every input. */
export async function runDevice(feature: Feature, cases: Cases, onChange: (cases: Cases) => void, stopped: () => boolean): Promise<Cases> {
  for (const c of feature.cases) {
    if (cases[c.id]?.device.length === RUNS) continue;
    const device: Run[] = [];
    for (let i = 0; i < RUNS && !stopped(); i++) {
      device.push(await ask(feature, DEVICE, c.input).then(({ text, seconds }) => ({ text, seconds }), failed));
    }
    if (stopped()) break;
    cases = { ...cases, [c.id]: { ...cases[c.id], device } };
    onChange(cases);
  }
  return cases;
}

/** Runs every input once in the cloud. The recorded check does this once; a visitor's rerun reuses its answers. */
export async function runCloud(feature: Feature, cases: Cases, onChange: (cases: Cases) => void, stopped: () => boolean = () => false): Promise<Cases> {
  for (const c of feature.cases) {
    if (stopped()) break;
    if (cases[c.id]?.cloud) continue;
    const cloud = await ask(feature, CLOUD, c.input).then(({ text, seconds, tokensIn, tokensOut }) => ({ text, seconds, tokensIn, tokensOut }), failed);
    cases = { ...cases, [c.id]: { ...(cases[c.id] ?? { device: [] }), cloud } };
    onChange(cases);
  }
  return cases;
}

/** Sends the cloud grader every answer of a feature that still needs its judgment, many in one request. */
export async function gradeFeature(feature: Feature, cases: Cases): Promise<Cases> {
  const items = ungraded(feature, cases);
  const checks: Check[] = [];
  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH);
    checks.push(...readGrades((await ask(GRADER, CLOUD, gradingPrompt(feature, batch))).text, batch.length));
  }
  return withGrades(cases, items, checks);
}

/**
 * Has the second grader judge every answer the cloud model judged, with the same request. Each batch is kept as it
 * comes, because the second grader's free day is short.
 */
export async function gradeAgain(feature: Feature, cases: Cases = {}, onChange: (cases: Cases) => void): Promise<Cases> {
  const items = notJudgedTwice(feature, cases);
  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH);
    const checks = readGrades((await ask(GRADER, CLOUD, gradingPrompt(feature, batch), SECOND_GRADER)).text, batch.length);
    onChange((cases = withGrades(cases, batch, checks, "second")));
  }
  return cases;
}
