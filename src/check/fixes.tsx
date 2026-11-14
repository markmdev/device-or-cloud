import { useEffect, useState } from "react";
import type { Feature } from "../features";
import { OutOfRequests } from "./ask";
import { tryLine, type Tried } from "./fix";
import { moves, RUNS, tally, type CheckRecord } from "./record";
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

/** What one more line in the instruction does for a feature kept in the cloud: recorded lines, and a line of the reader's own. */
export function Fixes({ feature, base, record, allowed, canRun }: { feature: Feature; base: Cases; record: CheckRecord; allowed: number; canRun: boolean }) {
  const fixes = record.fixes?.[feature.id] ?? [];
  const heldBase = record.held?.[feature.id];
  const [line, setLine] = useState("");
  const [tried, setTried] = useState<Tried>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    setLine(fixes[0]?.line ?? "");
    setTried(undefined);
    setNotice(undefined);
  }, [feature.id]);

  async function run() {
    setBusy(true);
    setNotice(undefined);
    try {
      await tryLine(feature, line.trim(), setTried, false);
    } catch (e) {
      if (!(e instanceof OutOfRequests)) throw e;
      setNotice(`${e.message} The answers that need the cloud model's judgement wait.`);
    }
    setBusy(false);
  }

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
          <p className="quiet">{fix.by === "cloud" ? "Proposed by the cloud model from the failures, word for word" : "Written by us after reading the failures"}</p>
          <blockquote>{fix.line}</blockquote>
          <Counts feature={feature} base={base} heldBase={heldBase} tried={fix} cloud />
          <p>
            <b>{moves(feature, fix, allowed) ? "Moves to the device." : "Doesn't move."}</b>
          </p>
        </article>
      ))}
      <article className="fix yours">
        <label>
          Try a line of your own
          <textarea value={line} onChange={(e) => setLine(e.target.value)} rows={3} />
        </label>
        <button onClick={run} disabled={busy || !canRun || !line.trim()}>
          {busy ? `Running: ${done} of ${total}` : "Run Chrome's model with this line"}
        </button>
        <p className="quiet">
          This runs on your computer.{" "}
          {feature.graded
            ? "This feature's answers are then sent to Google's free Gemini tier to be judged, which uses a few of the day's free requests."
            : "Nothing is sent anywhere."}
        </p>
        {notice && <p className="notice">{notice}</p>}
        {tried && !busy && <Counts feature={feature} base={base} heldBase={heldBase} tried={tried} cloud={false} />}
      </article>
    </section>
  );
}
