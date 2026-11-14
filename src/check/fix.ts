import type { Feature } from "../features";
import { ask, CLOUD } from "./ask";
import { verdictFor, type FixRecord } from "./record";
import { gradeFeature, runCloud, runDevice, type Cases } from "./run";

/** The feature with one more line at the end of its instruction. */
export const withLine = (feature: Feature, line: string): Feature => ({ ...feature, id: `${feature.id}+${line}`, system: `${feature.system} ${line}` });

/** The feature with its held-back inputs in place of the check's own. */
export const heldBackOf = (feature: Feature): Feature => ({ ...feature, cases: feature.heldBack ?? [] });

/** Lines we wrote ourselves after reading the record's failures, shown beside the cloud model's and labelled as ours. */
export const OUR_LINES: Record<string, string> = {
  review_mood:
    "Go by the buyer's final word on the product itself: positive if they end up pleased with it, negative if it broke, disappointed them or is going back, and mixed only if they say they can't decide.",
  email_address: "The street line must keep the house number or house name, and any flat or unit, as the customer gives them.",
};

const PROPOSER = {
  id: "proposer",
  system:
    "An app sends an instruction to a small language model that runs on the user's own device. You get that instruction and some inputs the small model answered wrongly, each with its answer and what was wrong. Write one sentence to add to the end of the instruction so the small model gets inputs like these right. Tell the model how to decide, in general terms; don't quote or name any of the inputs. One sentence only.",
  schema: { type: "object", properties: { line: { type: "string" } }, required: ["line"], additionalProperties: false },
};

export type Miss = { input: string; answer: string; reason: string };

/** What Chrome's model got wrong on a feature's inputs: one wrong answer for each input it missed. */
export function missesOf(feature: Feature, cases: Cases): Miss[] {
  return verdictFor(feature, cases).failures.flatMap((x) => {
    const at = x.device.findIndex((d) => !d.ok);
    const run = cases[x.c.id].device[at], check = x.device[at];
    return run && check && !check.ok ? [{ input: x.c.input, answer: "text" in run ? run.text : run.error, reason: check.reason }] : [];
  });
}

/** Asks the cloud model for one line to add to the instruction, from what Chrome's model got wrong. One request. */
export async function proposeLine(feature: Feature, misses: Miss[]): Promise<string> {
  const prompt =
    `<instruction>\n${feature.system}\n</instruction>\n` +
    misses.slice(0, 12).map((m) => `<wrong>\n<input>\n${m.input}\n</input>\n<answer>\n${m.answer}\n</answer>\n<problem>\n${m.reason}\n</problem>\n</wrong>`).join("\n");
  const { text } = await ask(PROPOSER, CLOUD, prompt);
  return String(JSON.parse(text).line).trim();
}

export type Tried = Pick<FixRecord, "cases" | "held">;
const neverStopped = () => false;

/**
 * Runs a line on Chrome's model over the check's inputs and the held-back ones, and has free-text answers judged.
 * With `cloud`, the held-back inputs also go to the cloud model once, to see the line doesn't break it there.
 */
export async function tryLine(feature: Feature, line: string, onChange: (tried: Tried) => void, cloud: boolean): Promise<Tried> {
  const lined = withLine(feature, line);
  let cases: Cases = {}, held: Cases = {};
  cases = await runDevice(lined, cases, (c) => onChange({ cases: c, held }), neverStopped);
  held = await runDevice(heldBackOf(lined), held, (h) => onChange({ cases, held: h }), neverStopped);
  if (cloud) held = await runCloud(heldBackOf(lined), held, (h) => onChange({ cases, held: h }));
  cases = await gradeFeature(lined, cases);
  held = await gradeFeature(heldBackOf(lined), held);
  onChange({ cases, held });
  return { cases, held };
}
