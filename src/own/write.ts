import { ask, CLOUD } from "../check/ask";
import { parse } from "../features/types";
import { filled, hasExpect, newId, readShape, type OwnFeature, type OwnInput } from "./feature";

export const WRITTEN = 30;

const WRITER = {
  id: "writer",
  system:
    `You help a developer test one AI feature of their app. You get the instruction the app sends its model, the shape of the answer it asks for, and a few inputs real users sent. Write ${WRITTEN} more inputs that real users of this app could send. About a third are ordinary ones, like the examples. The rest are hard in the ways real inputs are hard for this feature: for example a date written day first and one written month first, amounts that have to be added up, something the instruction asks for that is missing from the input, a long text with the needed part buried in it, two requests in one message, a word that points to the wrong answer, typing mistakes. Use only the kinds of difficulty that fit this feature, and keep each input something a real person would send, at about the length of the examples unless length is the difficulty. Make up every name, address and number, and never use the name of a real company, product or person. For each input give "kind": a few plain words in the plural for what kind of input it is, such as "dates written day first" or "ordinary messages"; inputs of one kind use exactly the same words, and the words must be true of the input. And give "expect" as the last message tells you.`,
  schema: {
    type: "object",
    properties: {
      inputs: {
        type: "array",
        items: {
          type: "object",
          properties: { input: { type: "string" }, kind: { type: "string" }, expect: { type: "string" } },
          required: ["input", "kind", "expect"],
          additionalProperties: false,
        },
      },
    },
    required: ["inputs"],
    additionalProperties: false,
  },
};

/** Asks the cloud model for more inputs, hard ones included, from the developer's own. One request. They arrive unticked. */
export async function writeInputs(own: OwnFeature): Promise<OwnInput[]> {
  const { schema } = readShape(own.shape);
  const prompt =
    `<instruction>\n${own.system.trim()}\n</instruction>\n<shape>\n${schema ? JSON.stringify(schema) : "plain text"}\n</shape>\n` +
    own.inputs
      .filter((i) => filled(i) && i.ticked)
      .slice(0, 12)
      .map((i) => `<example>\n<input>\n${i.input}\n</input>\n${hasExpect(i) ? `<right_answer>\n${i.expect.trim()}\n</right_answer>\n` : ""}</example>`)
      .join("\n") +
    (own.inputs.some((i) => filled(i) && i.ticked && hasExpect(i))
      ? `\n<expect>\nThe examples give right answers. For every input that has one right answer, write it in "expect" in exactly the form of the examples' right answers. Leave "expect" empty only where an input has no single right answer.\n</expect>`
      : `\n<expect>\nThe examples give no right answers. Leave every "expect" empty.\n</expect>`);
  const { text } = await ask(WRITER, CLOUD, prompt);
  const written: { input: string; kind: string; expect: string }[] = JSON.parse(text).inputs;
  const have = new Set(own.inputs.map((i) => i.input.trim()));
  return written
    .filter((w) => w.input.trim() && !have.has(w.input.trim()))
    .map((w) => ({
      id: newId("input"),
      input: w.input.trim(),
      // A right answer that isn't in the feature's shape can't be compared by code, so it isn't kept.
      expect: schema && !parse(w.expect) ? "" : w.expect.trim(),
      kind: w.kind.trim() || "inputs the cloud model wrote",
      by: "cloud",
      ticked: false,
    }));
}
