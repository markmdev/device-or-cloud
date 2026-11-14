import { DEFAULT_ALLOWED, moves, tally, VERDICT_NAME, verdictFor, type CheckRecord, type FixRecord, type Tally, type Verdict } from "../check/record";
import { FEATURES, type Feature } from "../features";

export type FixNumbers = { fix: FixRecord; own: Tally; held: Tally; moved: boolean };

export type FeatureNumbers = {
  feature: Feature;
  /** The verdict at the default bar. */
  verdict: Verdict;
  /** The same counts for each kind of input. */
  kinds: { kind: string; inputs: number; tally: Tally }[];
  /** The held-back inputs as the instruction stands. */
  held?: Tally;
  fixes: FixNumbers[];
};

/** Every count the results page shows, from the record alone. */
export function numbers(record: CheckRecord): FeatureNumbers[] {
  return FEATURES.map((feature) => {
    const cases = record.features[feature.id] ?? {};
    const kinds = [...new Set(feature.cases.map((c) => c.kind))];
    const heldBack = feature.heldBack ?? [];
    return {
      feature,
      verdict: verdictFor(feature, cases),
      kinds: kinds.map((kind) => {
        const inputs = feature.cases.filter((c) => c.kind === kind);
        return { kind, inputs: inputs.length, tally: tally(feature, cases, inputs) };
      }),
      held: record.held?.[feature.id] && tally(feature, record.held[feature.id], heldBack),
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
  const sum = (pick: (v: Verdict) => number) => all.reduce((n, f) => n + pick(f.verdict), 0);
  const lines = [
    `Recorded on ${record.machine}, Chrome ${record.chrome}, ${record.date}. Cloud model: ${record.cloudModel}.`,
    `Bar: up to ${DEFAULT_ALLOWED} wrong answers in 100.`,
    "",
    `All ${all.length} features, ${sum((v) => v.inputs)} inputs: Chrome's model right on ${sum((v) => v.runsRight)} of ${sum((v) => v.runs)} runs, the cloud on ${sum((v) => v.cloudRight)} of ${sum((v) => v.inputs)}.`,
  ];
  for (const f of all) {
    const v = f.verdict;
    lines.push("", `${f.feature.name}: ${VERDICT_NAME[v.kind]}`, `  Chrome's model ${v.runsRight} of ${v.runs} runs, the cloud ${v.cloudRight} of ${v.inputs}`);
    for (const k of f.kinds) lines.push(`    ${k.kind}: Chrome's model ${k.tally.runsRight} of ${k.tally.runs}, the cloud ${k.tally.cloudRight} of ${k.tally.cloud}`);
    if (f.held) lines.push(`  ${f.feature.heldBack?.length} inputs held back: Chrome's model ${f.held.runsRight} of ${f.held.runs}, the cloud ${f.held.cloudRight} of ${f.held.cloud}`);
    for (const x of f.fixes) {
      lines.push(
        `  With ${WHO[x.fix.by]}: Chrome's model ${x.own.runsRight} of ${x.own.runs} on the check's inputs and ${x.held.runsRight} of ${x.held.runs} on those held back, the cloud ${x.held.cloudRight} of ${x.held.cloud} on those held back. ${x.moved ? "Moves to the device." : "Doesn't move."}`,
      );
    }
  }
  return lines.join("\n") + "\n";
}
