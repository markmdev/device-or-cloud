import { useEffect, useState } from "react";
import type { Feature } from "../features";
import { OutOfRequests, outOfRequests } from "./ask";
import { missesOf, proposeLine, tryLine, type Tried } from "./fix";
import { moves, RUNS, shortOn, tally, type FixRecord } from "./record";
import type { Cases } from "./run";

function Counts({ feature, base, heldBase, tried, cloud }: { feature: Feature; base: Cases; heldBase?: Cases; tried: Tried; cloud: boolean }) {
  const held = feature.heldBack ?? [];
  const before = tally(feature, base), after = tally(feature, tried.cases);
  const heldBefore = tally(feature, heldBase, held), heldAfter = tally(feature, tried.held, held);
  return (
    <p>
      On the check's {feature.cases.length} inputs, Chrome's model went from {before.runsRight} to {after.runsRight} of {after.runs} runs right. On{" "}
      {held.length} inputs held back from the check, it was right on {heldBefore.runsRight} of {heldBefore.runs} runs before and {heldAfter.runsRight} of{" "}
      {heldAfter.runs} with the line
      {cloud ? `; the cloud model, on ${heldAfter.cloudRight} of ${heldAfter.cloud} with it.` : ". The cloud model wasn't asked again."}
    </p>
  );
}

/** Whether a line moves the feature to the device, and when it doesn't, the count that kept it back. */
function outcome(feature: Feature, heldBase: Cases, fix: FixRecord, allowed: number): string {
  const held = feature.heldBack ?? [];
  const own = tally(feature, fix.cases), kept = tally(feature, fix.held, held), before = tally(feature, heldBase, held);
  switch (shortOn(feature, fix, allowed)) {
    case undefined: return "Moves to the device.";
    case "answers": return "Doesn't move: not all of its answers are in.";
    case "check": return `Doesn't move: on the check's ${feature.cases.length} inputs Chrome's model is still outside the bar, right on ${own.runsRight} of ${own.runs} runs.`;
    case "held":
      return kept.runsRight < before.runsRight
        ? `Doesn't move: on the ${held.length} held-back inputs it got worse, ${before.runsRight} to ${kept.runsRight} of ${kept.runs} runs.`
        : `Doesn't move: on the ${held.length} held-back inputs Chrome's model is still outside the bar, right on ${kept.runsRight} of ${kept.runs} runs.`;
    case "cloud": return `Doesn't move: with the line, the cloud model falls outside the bar on the ${held.length} held-back inputs, right on ${kept.cloudRight} of ${kept.cloud}.`;
  }
}

const BY: Record<FixRecord["by"], string> = {
  cloud: "Proposed by the cloud model from the failures, word for word",
  us: "Written by us after reading the failures",
  you: "Your line",
};

/**
 * What one more line in the instruction does for a feature kept in the cloud: the lines already tried, and a line of the reader's own.
 * With onFix, the reader's line is also run in the cloud on the held-back inputs, so it gets its verdict and is kept.
 */
export function Fixes({ feature, base, heldBase, fixes, allowed, canRun, onFix }: {
  feature: Feature;
  base: Cases;
  heldBase: Cases;
  fixes: FixRecord[];
  allowed: number;
  canRun: boolean;
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
      <h2>Can one more line in the prompt move it?</h2>
      <p className="quiet">
        A line counts only if Chrome's model is within the bar with it on the check's inputs and on {feature.heldBack?.length} inputs that were kept
        out of the check, with the cloud model still within the bar on those.
      </p>
      {fixes.map((fix) => (
        <article key={fix.line} className="fix" data-moved={moves(feature, fix, allowed)}>
          <p className="quiet">{BY[fix.by]}</p>
          <blockquote>{fix.line}</blockquote>
          <Counts feature={feature} base={base} heldBase={heldBase} tried={fix} cloud />
          <p>
            <b>{outcome(feature, heldBase, fix, allowed)}</b>
          </p>
        </article>
      ))}
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
        {tried && !busy && !onFix && <Counts feature={feature} base={base} heldBase={heldBase} tried={tried} cloud={false} />}
      </article>
    </section>
  );
}
