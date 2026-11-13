import type { Check, Feature } from "../features";
import { ask, CLOUD } from "./ask";

const BATCH = 25;

const GRADER = {
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

/** Asks the cloud model to judge free-text answers, many in one request. A verdict with no reason counts as a fail. */
export async function grade(feature: Feature, items: ToGrade[]): Promise<Check[]> {
  const out: Check[] = [];
  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH);
    const prompt =
      `<instruction>\n${feature.system}\n</instruction>\n<judge>\n${feature.graded}\n</judge>\n` +
      batch.map((item, i) => `<case number="${i + 1}">\n<input>\n${item.input}\n</input>\n<answer>\n${item.answer}\n</answer>\n</case>`).join("\n");
    const { text } = await ask(GRADER, CLOUD, prompt);
    const verdicts: { number: number; reason: string; good: boolean }[] = JSON.parse(text).verdicts;
    batch.forEach((_, i) => {
      const v = verdicts.find((x) => x.number === i + 1);
      out.push(v?.good && v.reason.trim() ? { ok: true } : { ok: false, reason: v?.reason.trim() || "The grader gave no reason." });
    });
  }
  return out;
}
