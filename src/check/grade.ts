import type { Check, Feature } from "../features";
import { graded, type Cases } from "./record";

/** How many answers go to the grader in one request. */
export const BATCH = 25;

export const GRADER = {
  id: "grader",
  system:
    "You check answers a model gave for one feature of an app. You get the instruction the app sends, the one thing you are asked to judge, and a numbered list of inputs with the answer given for each. Judge each answer on its own against its input, and only on what you are asked to judge: other rules of the instruction are checked elsewhere. For each, write one short line saying what is wrong, or why it is right, and then whether it is good enough to show the app's users. Different wording is fine.",
  schema: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        items: {
          type: "object",
          properties: { number: { type: "integer" }, reason: { type: "string" }, good: { type: "boolean" } },
          required: ["number", "reason", "good"],
          additionalProperties: false,
        },
      },
    },
    required: ["verdicts"],
    additionalProperties: false,
  },
};

export type ToGrade = { input: string; answer: string };

/** What the grader is sent for one batch of a feature's answers. */
export const gradingPrompt = (feature: Pick<Feature, "system" | "graded">, batch: ToGrade[]) =>
  `<instruction>\n${feature.system}\n</instruction>\n<judge>\n${feature.graded}\n</judge>\n` +
  batch.map((item, i) => `<case number="${i + 1}">\n<input>\n${item.input}\n</input>\n<answer>\n${item.answer}\n</answer>\n</case>`).join("\n");

/** The grader's reply as one check for each answer of the batch. A verdict with no reason counts as a fail. */
export function readGrades(reply: string, count: number): Check[] {
  const verdicts: { number: number; reason: string; good: boolean }[] = JSON.parse(reply).verdicts;
  return Array.from({ length: count }, (_, i) => {
    const v = verdicts.find((x) => x.number === i + 1);
    return v?.good && v.reason.trim() ? { ok: true } : { ok: false, reason: v?.reason.trim() || "The grader gave no reason." };
  });
}

/** A feature's free-text answers that code found nothing wrong with and that have no grade yet. */
export function ungraded(feature: Feature, cases: Cases): (ToGrade & { id: string })[] {
  const items: (ToGrade & { id: string })[] = [];
  if (!feature.graded) return items;
  for (const c of feature.cases) {
    if (!graded(feature, c)) continue;
    const r = cases[c.id];
    const texts = new Set([...(r?.device ?? []), ...(r?.apple ?? []), r?.cloud].flatMap((run) => (run && "text" in run ? [run.text] : [])));
    for (const answer of texts) {
      if (feature.check(answer, c).ok && !r.grades?.[answer]) items.push({ id: c.id, input: c.input, answer });
    }
  }
  return items;
}

/** A feature's answers the cloud model has judged and the second grader hasn't. */
export function notJudgedTwice(feature: Feature, cases: Cases): (ToGrade & { id: string })[] {
  return feature.cases.flatMap((c) =>
    Object.keys(cases[c.id]?.grades ?? {}).filter((answer) => !cases[c.id].second?.[answer]).map((answer) => ({ id: c.id, input: c.input, answer })),
  );
}

/** The cases with a grader's checks for those answers put in: the cloud model's, or the second grader's. */
export function withGrades(cases: Cases, items: { id: string; answer: string }[], checks: Check[], by: "grades" | "second" = "grades"): Cases {
  const next = { ...cases };
  items.forEach((item, i) => {
    next[item.id] = { ...next[item.id], [by]: { ...next[item.id][by], [item.answer]: checks[i] } };
  });
  return next;
}
