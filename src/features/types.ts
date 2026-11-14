export type Case = {
  id: string;
  input: string;
  /** The right answer, where there is exactly one. */
  expect?: unknown;
  /** What kind of input this is, in a few plain words; failures are grouped by it. */
  kind: string;
  /** In a feature the cloud grader judges: code alone decides this input, because it has a right answer. */
  codeDecides?: boolean;
};

export type Check = { ok: true } | { ok: false; reason: string };

export type Feature = {
  id: string;
  /** The name its Remote Config parameter is built from, where that isn't the id. */
  key?: string;
  /** What the feature does, as the report names it. */
  name: string;
  /** The instruction the app sends with every request. */
  system: string;
  /** The JSON shape the app asks for; none means plain text. */
  schema?: Record<string, unknown>;
  cases: Case[];
  /** Inputs kept out of the check, used only to prove a change to the instruction on inputs it wasn't written from. */
  heldBack?: Case[];
  /** What code can decide about an answer. */
  check(answer: string, c: Case): Check;
  /** Set when code can't decide everything: what the cloud grader is asked to judge. */
  graded?: string;
};

const fail = (reason: string): Check => ({ ok: false, reason });
const OK: Check = { ok: true };

export function parse(answer: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(answer.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Compares text the way a person would: case, punctuation and spacing don't count. */
export const plain = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function label(labels: readonly string[]): Pick<Feature, "schema" | "check"> {
  return {
    schema: {
      type: "object",
      properties: { label: { type: "string", enum: labels } },
      required: ["label"],
      additionalProperties: false,
    },
    check(answer, c) {
      const got = parse(answer)?.label;
      if (typeof got !== "string") return fail("The answer isn't in the shape asked for.");
      return got === c.expect ? OK : fail(`Answered "${got}"; the right answer is "${c.expect}".`);
    },
  };
}

type Field = { type: "string" | "number" | "boolean"; same?: (got: unknown, want: unknown) => boolean };

/** A fixed set of fields, each compared with its right value. */
export function fields(shape: Record<string, Field>, only?: string[]): Pick<Feature, "schema" | "check"> {
  return {
    schema: {
      type: "object",
      properties: Object.fromEntries(Object.entries(shape).map(([k, f]) => [k, { type: f.type }])),
      required: Object.keys(shape),
      additionalProperties: false,
    },
    check(answer, c) {
      const got = parse(answer);
      if (!got) return fail("The answer isn't in the shape asked for.");
      const want = c.expect as Record<string, unknown>;
      for (const [k, f] of Object.entries(shape)) {
        if (only && !only.includes(k)) continue;
        const same = f.same ?? (f.type === "string" ? (a, b) => plain(a) === plain(b) : (a, b) => a === b);
        if (!same(got[k], want[k])) return fail(`${k}: answered ${show(got[k])}; the right answer is ${show(want[k])}.`);
      }
      return OK;
    },
  };
}

export const show = (v: unknown) => (typeof v === "string" ? (v === "" ? "nothing" : `"${v}"`) : String(v));

export const money = (got: unknown, want: unknown) =>
  typeof got === "number" && Math.abs(got - (want as number)) < 0.005;

export const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export { fail, OK };
