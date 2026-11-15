import { APPLES, countLine, DEFAULT_ALLOWED, moves, onApple, tally, unsureLine, VERDICT_NAME, verdictFor, whereApple, type CheckRecord, type FixRecord, type Tally, type Verdict } from "../check/record";
import { FEATURES, type Feature } from "../features";

export type FixNumbers = { fix: FixRecord; own: Tally; held: Tally; moved: boolean };

export type FeatureNumbers = {
  feature: Feature;
  /** The verdict at the default bar. */
  verdict: Verdict;
  /** The verdict in the iPhone app, on Apple's model, where the record has its runs. */
  apple?: Verdict;
  /** The same counts for each kind of input; `apple` counts Apple's runs. */
  kinds: { kind: string; inputs: number; tally: Tally; apple?: Tally }[];
  /** The held-back inputs as the instruction stands. */
  held?: Tally;
  heldApple?: Tally;
  fixes: FixNumbers[];
};

/** Every count the results page shows, from the record alone. */
export function numbers(record: CheckRecord): FeatureNumbers[] {
  return FEATURES.map((feature) => {
    const cases = record.features[feature.id] ?? {};
    const kinds = [...new Set(feature.cases.map((c) => c.kind))];
    const heldBack = feature.heldBack ?? [];
    const apple = record.apple && onApple(cases), held = record.held?.[feature.id];
    return {
      feature,
      verdict: verdictFor(feature, cases),
      apple: apple && verdictFor(feature, apple),
      kinds: kinds.map((kind) => {
        const inputs = feature.cases.filter((c) => c.kind === kind);
        return { kind, inputs: inputs.length, tally: tally(feature, cases, inputs), apple: apple && tally(feature, apple, inputs) };
      }),
      held: held && tally(feature, held, heldBack),
      heldApple: record.apple && held && tally(feature, onApple(held), heldBack),
      fixes: (record.fixes?.[feature.id] ?? []).map((fix) => ({
        fix,
        own: tally(feature, fix.cases),
        held: tally(feature, fix.held, heldBack),
        moved: moves(feature, fix, DEFAULT_ALLOWED),
      })),
    };
  });
}

export const WHO: Record<FixRecord["by"], string> = { cloud: "the cloud model's line", us: "our line", you: "your line" };

/** The same numbers as text, for the repo's command. */
export function printed(record: CheckRecord): string {
  const all = numbers(record);
  const a = record.apple;
  const onDevice = (t: { inputsRight: number; inputs: number; runsRight: number; runs: number }) =>
    `${t.inputsRight} of ${t.inputs} inputs right on every run${t.runsRight * t.inputs !== t.inputsRight * t.runs ? ` (${t.runsRight} of ${t.runs} runs)` : ""}`;
  const apples = (t?: Parameters<typeof onDevice>[0]) => (t ? `, Apple's model ${onDevice(t)}` : "");
  const allows = (v: Verdict, who?: string) => `${countLine(v, who)}${v.unsure ? ` ${unsureLine(v, who)}` : ""}`;
  const lines = [
    `Recorded on ${record.machine}, Chrome ${record.chrome}, ${record.date}. Cloud model: ${record.cloudModel}.`,
    ...(a ? [whereApple(a)] : []),
    `Bar: up to ${DEFAULT_ALLOWED} wrong answers in 100.`,
  ];
  for (const f of all) {
    const v = f.verdict;
    lines.push("", `${f.feature.name}: ${VERDICT_NAME[v.kind]} ${allows(v)}`);
    if (f.apple) lines.push(`  In the iPhone app: ${VERDICT_NAME[f.apple.kind]} ${allows(f.apple, APPLES)}`);
    for (const k of f.kinds) lines.push(`    ${k.kind}: Chrome's model ${onDevice(k.tally)}${apples(k.apple)}, the cloud ${k.tally.cloudRight} of ${k.tally.cloud}`);
    if (f.held) lines.push(`  ${f.feature.heldBack?.length} inputs held back: Chrome's model ${onDevice(f.held)}${apples(f.heldApple)}, the cloud ${f.held.cloudRight} of ${f.held.cloud}`);
    for (const x of f.fixes) {
      lines.push(
        `  ${x.fix.steady ? "With its randomness off" : `With ${WHO[x.fix.by]}`}, ${x.fix.on ? "Apple's" : "Chrome's"} model: ${x.own.runsRight} of ${x.own.runs} runs on the check's inputs and ${x.held.runsRight} of ${x.held.runs} on those held back, the cloud ${x.held.cloudRight} of ${x.held.cloud} on those held back. ${x.moved ? "Within the bar on both." : "Not within the bar on both."}`,
      );
    }
  }
  return lines.join("\n") + "\n";
}
