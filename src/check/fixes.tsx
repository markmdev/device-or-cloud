import { useEffect, useState } from "react";
import type { Feature } from "../features";
import { OutOfRequests, outOfRequests } from "./ask";
import { missesOf, proposeLine, tryLine, type Tried } from "./fix";
import { fixRange, moves, RUNS, shortOn, tally, UNSURE, type FixRecord } from "./record";
import type { Cases } from "./run";

function Counts({ feature, who, base, heldBase, tried, cloud, allowed }: { feature: Feature; who: string; base: Cases; heldBase?: Cases; tried: Tried; cloud: boolean; allowed: number }) {
  const held = feature.heldBack ?? [];
  const before = tally(feature, base), after = tally(feature, tried.cases);
  const heldBefore = tally(feature, heldBase, held), heldAfter = tally(feature, tried.held, held);
  const allows = after.runs === feature.cases.length * RUNS ? fixRange(feature, tried, allowed) : undefined;
  return (
    <>
    <p>
      On the check's {feature.cases.length} inputs, {who} went from {before.runsRight} to {after.runsRight} of {after.runs} runs right. On{" "}
      {held.length} inputs held back from the check, it was right on {heldBefore.runsRight} of {heldBefore.runs} runs before and {heldAfter.runsRight} of{" "}
      {heldAfter.runs} with {HOW[kindOf(tried)]}
      {cloud && heldAfter.cloud ? `; the cloud model, on ${heldAfter.cloudRight} of ${heldAfter.cloud} with it.` : ". The cloud model wasn't asked again."}
    </p>
    {allows && (
      <p className="allows">
        Its count on the check's inputs allows{" "}
        <span className="range">
          {Math.round(allows.range.low)} to {Math.round(allows.range.high)} wrong in 100
        </span>
        . {allows.unsure && <span className="unsure">{UNSURE}</span>}
      </p>
    )}
    </>
  );
}

const kindOf = (fix: { steady?: boolean }) => (fix.steady ? "setting" : "line");
const HOW = { line: "the line", setting: "the setting" };

/**
 * Whether a line, or a setting, puts the feature within the bar on the device, and when it doesn't, the count that kept it back.
 * For a feature already on the device, the question is whether the change holds there.
 */
function outcome(feature: Feature, who: string, onDevice: boolean, heldBase: Cases, fix: FixRecord, allowed: number): string {
  const held = feature.heldBack ?? [];
  const own = tally(feature, fix.cases), kept = tally(feature, fix.held, held), before = tally(feature, heldBase, held);
  const no = onDevice ? "Doesn't hold" : "Doesn't move";
  switch (shortOn(feature, fix, allowed)) {
    case undefined: return onDevice ? "Holds on the device." : "Moves to the device.";
    case "answers": return `${no}: not all of its answers are in.`;
    case "check": return `${no}: on the check's ${feature.cases.length} inputs ${who} is ${onDevice ? "" : "still "}outside the bar, right on ${own.runsRight} of ${own.runs} runs.`;
    case "held":
      return kept.runsRight < before.runsRight
        ? `${no}: on the ${held.length} held-back inputs it got worse, ${before.runsRight} to ${kept.runsRight} of ${kept.runs} runs.`
        : `${no}: on the ${held.length} held-back inputs ${who} is still outside the bar, right on ${kept.runsRight} of ${kept.runs} runs.`;
    case "cloud": return `${no}: with ${HOW[kindOf(fix)]}, the cloud model falls outside the bar on the ${held.length} held-back inputs, right on ${kept.cloudRight} of ${kept.cloud}.`;
  }
}

const BY: Record<FixRecord["by"], string> = {
  cloud: "Proposed by the cloud model from the failures, word for word",
  us: "Written by us after reading the failures",
  you: "Your line",
};

/** A setting in place of a line, in words. */
const STEADY = "Apple's model with its randomness off: it always gives its most likely answer, the same every time.";

/**
 * What one more line in the instruction does for a feature: the lines already tried on `who`, and, with `canTry`, a line of the
 * reader's own. With onFix, the reader's line is also run in the cloud on the held-back inputs, so it gets its verdict and is kept.
 */
export function Fixes({ feature, who, onDevice, base, heldBase, fixes, shipped, allowed, canRun, canTry, onFix }: {
  feature: Feature;
  /** The on-device model the lines were tried on. */
  who: string;
  /** The feature already runs on the device, so a line is there to mend what it still gets wrong. */
  onDevice: boolean;
  base: Cases;
  heldBase: Cases;
  fixes: FixRecord[];
  /** The one the template under "Apply it" moves the feature with, when one does. */
  shipped?: FixRecord;
  allowed: number;
  canRun: boolean;
  canTry: boolean;
  onFix?: (fix: FixRecord) => void;
}) {
  const [line, setLine] = useState("");
  const [proposed, setProposed] = useState<string>();
  const [tried, setTried] = useState<Tried>();
  const [busy, setBusy] = useState<"proposing" | "running">();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    setLine(fixes[0]?.line ?? "");
    setProposed(undefined);
    setTried(undefined);
    setNotice(undefined);
  }, [feature.id]);

  async function saying(what: () => Promise<void>, waits: string) {
    setNotice(undefined);
    try {
      await what();
    } catch (e) {
      if (!(e instanceof OutOfRequests)) throw e;
      setNotice(`${outOfRequests(e)} ${waits}`);
    }
    setBusy(undefined);
  }

  const propose = () =>
    saying(async () => {
      setBusy("proposing");
      const written = await proposeLine(feature, missesOf(feature, base));
      setProposed(written);
      setLine(written);
    }, "The line waits.");

  const run = () =>
    saying(async () => {
      setBusy("running");
      const text = line.trim();
      const result = await tryLine(feature, text, setTried, !!onFix);
      if (onFix) {
        onFix({ line: text, by: text === proposed ? "cloud" : "you", ...result });
        setTried(undefined);
      }
    }, "The answers that need the cloud model wait.");

  const done = tried ? tally(feature, tried.cases).runs + tally(feature, tried.held, feature.heldBack).runs : 0;
  const total = (feature.cases.length + (feature.heldBack?.length ?? 0)) * RUNS;
  return (
    <section className="fixes">
      <h2>{onDevice ? "Can one more line in the prompt mend what it still gets wrong?" : "Can one more line in the prompt move it?"}</h2>
      {!fixes.length && !canTry ? (
        <p className="quiet">Nothing was tried on {who} for this feature.</p>
      ) : (
        <p className="quiet">
          A line counts only if {who} is within the bar with it on the check's inputs and on {feature.heldBack?.length} inputs that were kept
          out of the check, with the cloud model still within the bar on those.
          {fixes.some((fix) => fix.steady) && " A setting is measured the same way."}
        </p>
      )}
      {fixes.map((fix) => (
        <article key={`${fix.line}${fix.steady}`} className="fix" data-kind={kindOf(fix)} data-moved={moves(feature, fix, allowed)}>
          <p className="quiet">{fix.steady ? "A setting, not a line" : BY[fix.by]}</p>
          {fix.steady ? <h3>{STEADY}</h3> : <blockquote>{fix.line}</blockquote>}
          <Counts feature={feature} who={who} base={base} heldBase={heldBase} tried={fix} cloud allowed={allowed} />
          <p>
            <b>{outcome(feature, who, onDevice, heldBase, fix, allowed)}</b>
          </p>
          {fix === shipped && <p className="shipped">The template under "Apply it" moves this feature with this {kindOf(fix)}: it is there beside the mode.</p>}
        </article>
      ))}
      {canTry && (
      <article className="fix yours">
        <label>
          Try a line of your own
          <textarea value={line} onChange={(e) => setLine(e.target.value)} rows={3} />
        </label>
        {onFix && (
          <button onClick={propose} disabled={!!busy}>
            {busy === "proposing" ? "Asking the cloud model" : "Ask the cloud model for a line"}
          </button>
        )}
        <button onClick={run} disabled={!!busy || !canRun || !line.trim()}>
          {busy === "running" ? `Running: ${done} of ${total}` : "Run Chrome's model with this line"}
        </button>
        <p className="quiet">
          This runs on your computer.{" "}
          {onFix
            ? `The ${feature.heldBack?.length} held-back inputs then go to the cloud model once with the line, to see it still answers them right.`
            : feature.graded
              ? "This feature's answers are then sent to Google's free Gemini tier to be judged, which uses a few of the day's free requests."
              : "Nothing is sent anywhere."}
        </p>
        {notice && <p className="notice">{notice}</p>}
        {tried && !busy && !onFix && <Counts feature={feature} who={who} base={base} heldBase={heldBase} tried={tried} cloud={false} allowed={allowed} />}
      </article>
      )}
    </section>
  );
}
