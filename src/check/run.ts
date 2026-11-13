import type { Feature } from "../features";
import { ask, CLOUD, DEVICE, OutOfRequests } from "./ask";
import { grade, type ToGrade } from "./grade";
import { RUNS, type CaseRecord, type Run } from "./record";

export type Cases = Record<string, CaseRecord>;

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
export async function runCloud(feature: Feature, cases: Cases, onChange: (cases: Cases) => void): Promise<Cases> {
  for (const c of feature.cases) {
    if (cases[c.id]?.cloud) continue;
    const cloud = await ask(feature, CLOUD, c.input).then(({ text, seconds, tokensIn, tokensOut }) => ({ text, seconds, tokensIn, tokensOut }), failed);
    cases = { ...cases, [c.id]: { ...(cases[c.id] ?? { device: [] }), cloud } };
    onChange(cases);
  }
  return cases;
}

/** Sends the cloud grader every free-text answer that code found nothing wrong with and that has no grade yet. */
export async function gradeFeature(feature: Feature, cases: Cases): Promise<Cases> {
  if (!feature.graded) return cases;
  const items: (ToGrade & { id: string })[] = [];
  for (const c of feature.cases) {
    const r = cases[c.id];
    const texts = new Set([...(r?.device ?? []), r?.cloud].flatMap((run) => (run && "text" in run ? [run.text] : [])));
    for (const answer of texts) {
      if (feature.check(answer, c).ok && !r.grades?.[answer]) items.push({ id: c.id, input: c.input, answer });
    }
  }
  if (!items.length) return cases;
  const checks = await grade(feature, items);
  const next = { ...cases };
  items.forEach((item, i) => {
    next[item.id] = { ...next[item.id], grades: { ...next[item.id].grades, [item.answer]: checks[i] } };
  });
  return next;
}
