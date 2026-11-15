import type { Case, Feature } from "../features";
import { FEATURES } from "../features";
import type { Cases, CheckRecord } from "../check/record";

/** One answer the cloud model judged. */
export type Judged = { feature: Feature; c: Case; answer: string };

/** What a person's mark belongs to: one answer to one input of one feature. */
export const markKey = (featureId: string, inputId: string, answer: string) => `${featureId}\n${inputId}\n${answer}`;

/** A person's mark: whether the answer is good enough, and the browser it came from, as a random id. */
export type Mark = { good: boolean; by: string };

/** Every distinct answer to the check's own inputs that the cloud model judged: the ones people are asked to mark. */
export const judgedInCheck = (record: CheckRecord, features: Feature[] = FEATURES): Judged[] =>
  features.filter((f) => f.graded).flatMap((feature) =>
    feature.cases.flatMap((c) => Object.keys(record.features[feature.id]?.[c.id]?.grades ?? {}).map((answer) => ({ feature, c, answer }))),
  );

/** How the second model and people compare with the cloud model, on the answers it judged. */
export type Judges = {
  /** The answers the cloud model judged in the whole record; an answer given again under a tried line counts again. */
  judged: number;
  /** How many of those the second model has judged, on how many the two agree, and on how many of the rest the second said no where the cloud said yes. */
  second: number;
  secondAgrees: number;
  secondStricter: number;
  /** The answers people marked, on how many the cloud model agrees with them, and the same for the second model on those it has judged. */
  marked: number;
  cloudAgrees: number;
  markedAndSecond: number;
  secondAgreesWithPeople: number;
};

export function judges(record: CheckRecord, marks: Map<string, Mark> = new Map(), features: Feature[] = FEATURES): Judges {
  const j: Judges = { judged: 0, second: 0, secondAgrees: 0, secondStricter: 0, marked: 0, cloudAgrees: 0, markedAndSecond: 0, secondAgreesWithPeople: 0 };
  const everywhere = (id: string): Cases[] => [record.features[id] ?? {}, record.held?.[id] ?? {}, ...(record.fixes?.[id] ?? []).flatMap((fix) => [fix.cases, fix.held])];
  for (const feature of features.filter((f) => f.graded)) {
    for (const cases of everywhere(feature.id)) {
      for (const r of Object.values(cases)) {
        for (const [answer, grade] of Object.entries(r.grades ?? {})) {
          j.judged++;
          const second = r.second?.[answer];
          if (!second) continue;
          j.second++;
          if (second.ok === grade.ok) j.secondAgrees++;
          else if (grade.ok) j.secondStricter++;
        }
      }
    }
  }
  for (const { feature, c, answer } of judgedInCheck(record, features)) {
    const mark = marks.get(markKey(feature.id, c.id, answer)), r = record.features[feature.id][c.id];
    if (!mark) continue;
    j.marked++;
    if (r.grades![answer].ok === mark.good) j.cloudAgrees++;
    const second = r.second?.[answer];
    if (second) { j.markedAndSecond++; if (second.ok === mark.good) j.secondAgreesWithPeople++; }
  }
  return j;
}

/** How many marks it takes before the page says how far the models agree with people. */
export const MARKS_TO_SAY = 30;
