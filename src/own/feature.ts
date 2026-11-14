import { fail, OK, parse, plain, show, type Case, type Check, type Feature } from "../features/types";
import { ENOUGH_INPUTS } from "../check/record";

export type OwnInput = {
  id: string;
  input: string;
  /** The right answer as typed, or empty when there isn't one. */
  expect: string;
  kind: string;
  by: "you" | "cloud";
  /** Inputs the cloud model wrote count only once the developer has ticked them. */
  ticked: boolean;
};

/** One feature as a developer pastes it. */
export type OwnFeature = {
  id: string;
  name: string;
  system: string;
  /** Empty for plain text; otherwise a JSON schema or one example answer. */
  shape: string;
  inputs: OwnInput[];
};

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
export const YOURS = "your own inputs";
export const blankInput = (): OwnInput => ({ id: newId("input"), input: "", expect: "", kind: YOURS, by: "you", ticked: true });
export const blankFeature = (): OwnFeature => ({ id: newId("own"), name: "", system: "", shape: "", inputs: [blankInput(), blankInput(), blankInput()] });

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);

function schemaOf(example: unknown): Json {
  if (Array.isArray(example)) return { type: "array", items: schemaOf(example[0] ?? "") };
  if (isObject(example)) {
    return {
      type: "object",
      properties: Object.fromEntries(Object.entries(example).map(([k, v]) => [k, schemaOf(v)])),
      required: Object.keys(example),
      additionalProperties: false,
    };
  }
  return { type: typeof example === "number" ? "number" : typeof example === "boolean" ? "boolean" : "string" };
}

/** The pasted shape as the JSON schema both models are sent: a schema as it is, an example answer turned into one. */
export function readShape(text: string): { schema?: Json; error?: string } {
  if (!text.trim()) return {};
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { error: "This isn't JSON. Paste the JSON schema your app sends or one example answer, or leave it empty for plain text." };
  }
  if (!isObject(v)) return { error: "The answer's shape has to be a JSON object." };
  return { schema: v.type === "object" && isObject(v.properties) ? v : schemaOf(v) };
}

/** The first place an answer differs from the right one, in words; text is compared as a person would, numbers to the cent. */
function difference(got: unknown, want: unknown, path: string): string | null {
  const wrong = () => `${path ? `${path}: answered` : "Answered"} ${show(got)}; the right answer is ${show(want)}.`;
  if (Array.isArray(want)) {
    if (!Array.isArray(got) || got.length !== want.length) return `${path ? `${path}: ` : ""}answered with ${Array.isArray(got) ? got.length : "no"} in the list; the right answer has ${want.length}.`;
    return want.reduce<string | null>((found, w, i) => found ?? difference(got[i], w, `${path}[${i + 1}]`), null);
  }
  if (isObject(want)) {
    if (!isObject(got)) return wrong();
    return Object.keys(want).reduce<string | null>((found, k) => found ?? difference(got[k], want[k], path ? `${path}.${k}` : k), null);
  }
  if (typeof want === "number") return typeof got === "number" && Math.abs(got - want) < 0.005 ? null : wrong();
  if (typeof want === "string") return (typeof got === "string" || typeof got === "number") && plain(got) === plain(want) ? null : wrong();
  return got === want ? null : wrong();
}

function fitsShape(answer: Json, schema: Json): Check {
  const properties = isObject(schema.properties) ? schema.properties : {};
  for (const key of Array.isArray(schema.required) ? (schema.required as string[]) : []) {
    if (!(key in answer)) return fail(`The answer has no "${key}".`);
  }
  for (const [key, value] of Object.entries(answer)) {
    const allowed = isObject(properties[key]) ? properties[key].enum : undefined;
    if (Array.isArray(allowed) && !allowed.includes(value)) return fail(`${key}: answered ${show(value)}, which isn't one of the values allowed.`);
  }
  return OK;
}

const GRADED = "Whether this is a right answer to the input under the whole instruction: every rule in it followed, nothing wrong and nothing made up.";

export const hasExpect = (i: OwnInput) => i.expect.trim() !== "";
export const filled = (i: OwnInput) => i.input.trim() !== "";

/**
 * Which inputs the check runs, and which are kept out of it to prove a change to the instruction. One in four of the ticked
 * inputs the cloud model wrote is kept back, as long as the check keeps enough to give a verdict.
 */
export function split(own: OwnFeature): { inCheck: OwnInput[]; heldBack: OwnInput[] } {
  const used = own.inputs.filter((i) => filled(i) && i.ticked);
  const written = used.filter((i) => i.by === "cloud");
  const heldBack = written.filter((_, n) => n % 4 === 3).slice(0, Math.max(0, used.length - ENOUGH_INPUTS));
  return { inCheck: used.filter((i) => !heldBack.includes(i)), heldBack };
}

/** What stops a pasted feature from being checked, in the form's own words; nothing when it's ready. */
export function problem(own: OwnFeature): string | undefined {
  if (!own.system.trim()) return "Paste the instruction your app sends.";
  const { schema, error } = readShape(own.shape);
  if (error) return error;
  if (!own.inputs.some((i) => filled(i) && i.ticked)) return "Add at least one input.";
  if (schema) {
    const bad = own.inputs.find((i) => filled(i) && hasExpect(i) && !parse(i.expect));
    if (bad) return `A right answer isn't JSON like the answer's shape: "${bad.expect.trim().slice(0, 60)}".`;
  }
  return undefined;
}

/** The pasted feature in the form the check runs. An input with a right answer is decided by code; the rest go to the cloud grader. */
export function toFeature(own: OwnFeature): Feature {
  const { schema } = readShape(own.shape);
  const toCase = (i: OwnInput): Case => ({
    id: i.id,
    input: i.input,
    kind: i.kind,
    ...(hasExpect(i) ? { expect: schema ? parse(i.expect) : i.expect.trim(), codeDecides: true } : {}),
  });
  const { inCheck, heldBack } = split(own);
  return {
    id: own.id,
    name: own.name.trim() || "Your feature",
    system: own.system.trim(),
    schema,
    cases: inCheck.map(toCase),
    heldBack: heldBack.length ? heldBack.map(toCase) : undefined,
    graded: [...inCheck, ...heldBack].some((i) => !hasExpect(i)) ? GRADED : undefined,
    check(answer, c) {
      const got = schema ? parse(answer) : answer.trim();
      if (schema) {
        if (!got) return fail("The answer isn't in the shape asked for.");
        const fits = fitsShape(got as Json, schema);
        if (!fits.ok) return fits;
      }
      if (c.expect === undefined) return OK;
      const wrong = difference(got, c.expect, "");
      return wrong ? fail(wrong) : OK;
    },
  };
}
