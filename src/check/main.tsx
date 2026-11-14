import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SOURCE_LABEL } from "../answer";
import "../base.css";
import { FEATURES, type Check, type Feature } from "../features";
import { parse, plain } from "../features/types";
import { DownloadPanel } from "../download";
import { CLOUD_MODEL, deviceState, type DeviceState } from "../firebase";
import { OutOfRequests } from "./ask";
import { heldBackOf, OUR_LINES, proposeLine, tryLine } from "./fix";
import { Fixes } from "./fixes";
import recorded from "./recorded.json";
import { barInWords, DEFAULT_ALLOWED, dollarsPerRequest, moves, RUNS, VERDICT_NAME, verdictFor, verdictLine, type CheckRecord, type Failure, type FixRecord, type Run, type Verdict } from "./record";
import { gradeFeature, runCloud, runDevice, type Cases } from "./run";

const RECORD = recorded as CheckRecord;
const chromeVersion = () => /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? "?";

/** One model's share of right answers, with the bar marked on it. */
function Meter({ who, right, of, unit, allowed }: { who: string; right: number; of: number; unit: string; allowed: number }) {
  return (
    <span className="meter" data-within={(of - right) * 100 <= allowed * of}>
      <span>{who}</span>
      <i style={{ "--share": right / of, "--bar": 1 - allowed / 100 } as React.CSSProperties} />
      <span>
        <b>{right}</b> of {of}
        {unit}
      </span>
    </span>
  );
}

function FeatureRow({ v, mine, selected, onSelect, allowed, named }: { v: Verdict; mine: boolean; selected: boolean; onSelect: () => void; allowed: number; named?: boolean }) {
  const counted = v.kind === "device" || v.kind === "cloud" || v.kind === "fix";
  return (
    <li>
      <button className="feature" data-verdict={v.kind} aria-pressed={selected} onClick={onSelect} style={{ viewTransitionName: `feature-${v.feature.id}` }}>
        <strong>{v.feature.name}</strong>
        {named && <em>{VERDICT_NAME[v.kind].replace(/\.$/, "")}</em>}
        {counted ? (
          <>
            <Meter who="Chrome's model" right={v.runsRight} of={v.runs} unit=" runs" allowed={allowed} />
            <Meter who="The cloud" right={v.cloudRight} of={v.inputs} unit="" allowed={allowed} />
            {v.kind === "cloud" && v.pattern && <small>Its misses: {v.pattern}.</small>}
          </>
        ) : (
          <span>{verdictLine(v)}</span>
        )}
        {mine && <small>Run on this computer just now</small>}
      </button>
    </li>
  );
}

/** A tick or a cross beside an answer. */
const Mark = ({ ok }: { ok?: boolean }) => (
  <svg className="mark" viewBox="0 0 30 30" aria-label={ok ? "Right" : "Wrong"}>
    <circle cx="15" cy="15" r="15" />
    <path d={ok ? "M8.5 15.5l4.5 4.5 8.5-10" : "M10 10l10 10M20 10L10 20"} />
  </svg>
);

const textOf = (run?: Run) => (run && "text" in run ? run.text : undefined);

/** The fields in which two answers differ: what a reader should look at first. */
function differing(a?: string, b?: string): string[] {
  const one = a ? parse(a) : null, other = b ? parse(b) : null;
  if (!one || !other) return [];
  return Object.keys(one).filter((key) => plain(one[key]) !== plain(other[key]));
}

/** What an answer shows large: the first field that tells the two answers apart, or the whole text. */
function headline(text: string | undefined, telling: string[]): { key?: string; value: string } | undefined {
  if (text === undefined) return undefined;
  const object = parse(text);
  if (!object) return { value: text };
  const key = telling[0] ?? Object.keys(object)[0];
  return key === undefined ? undefined : { key, value: String(object[key]) || "(empty)" };
}

function RunAnswer({ run, check, telling, size, children }: { run?: Run; check?: Check; telling: string[]; size: string; children?: ReactNode }) {
  if (!run) return <p className="quiet">No answer yet.</p>;
  const object = "text" in run ? parse(run.text) : null;
  const head = headline(textOf(run), telling);
  return (
    <div className="said" data-ok={check?.ok} data-size={size}>
      {"error" in run ? (
        <p className="answer">{run.error}</p>
      ) : (
        <>
          <p className="telling">
            {head?.key && <span>{head.key}</span>}
            <b>{head?.value}</b>
            {check && <Mark ok={check.ok} />}
          </p>
          {object && Object.keys(object).length > 1 && (
            <dl className="answer">
              {Object.entries(object).map(([key, value]) => (
                <div key={key} data-telling={telling.includes(key)}>
                  <dt>{key}</dt>
                  <dd>{String(value) || "(empty)"}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
      {children}
    </div>
  );
}

function Proof({ v, cases }: { v: Verdict; cases: Cases }) {
  const [at, setAt] = useState(0);
  useEffect(() => setAt(0), [v.feature.id]);
  if (v.kind === "pending") return <section className="proof"><p className="quiet">{v.feature.name}: waiting for answers.</p></section>;
  if (!v.failures.length) {
    return (
      <section className="proof">
        <p>
          <strong>{v.feature.name}.</strong> Chrome's model and the cloud model were both right on all {v.inputs} inputs, on every run.
        </p>
      </section>
    );
  }
  // The plainest failures come first: only Chrome's model wrong, and on every run.
  const sameOnAllRuns = (x: Failure) => new Set(cases[x.c.id].device.map((d) => ("text" in d ? d.text.replace(/\s+/g, "") : d.error))).size === 1;
  const plainness = (x: Failure) => (x.side === "device" ? 0 : 4) + (x.device.every((d) => !d.ok) ? 0 : 2) + (sameOnAllRuns(x) ? 0 : 1);
  const failures = [...v.failures].sort((a, b) => plainness(a) - plainness(b));
  const f: Failure = failures[Math.min(at, failures.length - 1)];
  const r = cases[f.c.id];
  const worst = Math.max(0, f.device.findIndex((d) => !d.ok));
  const run = r.device[worst];
  const wrongRuns = f.device.filter((d) => !d.ok).length;
  const sameText = new Set(r.device.map((d) => ("text" in d ? d.text : d.error))).size === 1;
  const decidedByCode = !v.feature.graded || !v.feature.check("text" in run ? run.text : "", f.c).ok;
  const telling = differing(textOf(run), textOf(r.cloud));
  const longest = Math.max(...[run, r.cloud].map((x) => headline(textOf(x), telling)?.value.length ?? 0));
  const size = longest <= 16 ? "large" : longest <= 40 ? "medium" : "small";
  const deviceCheck = f.device[worst];
  return (
    <section className="proof">
      <div className="side device">
        <p className="badge" data-source="on_device">
          {SOURCE_LABEL.on_device}
          {"seconds" in run && ` · ${run.seconds.toFixed(1)} s`}
        </p>
        <p className="who">Chrome's model answered</p>
        <RunAnswer run={run} check={deviceCheck} telling={telling} size={size}>
          <p className="quiet">
            {wrongRuns === 0 ? `Right on all ${RUNS} runs.` : sameText ? `The same answer on all ${RUNS} runs.` : `Wrong on ${wrongRuns} of ${RUNS} runs.`}
          </p>
        </RunAnswer>
      </div>
      <div className="input">
        <p className="quiet">
          {v.feature.name} · input {v.feature.cases.indexOf(f.c) + 1} of {v.inputs}
          <span className="pager">
            <button onClick={() => setAt((at + failures.length - 1) % failures.length)} aria-label="Previous">‹</button>
            {Math.min(at, failures.length - 1) + 1} of {failures.length}
            <button onClick={() => setAt((at + 1) % failures.length)} aria-label="Next">›</button>
          </span>
        </p>
        <pre>{f.c.input}</pre>
        <p className="why">
          {!deviceCheck.ok ? deviceCheck.reason : f.cloud && !f.cloud.ok ? f.cloud.reason : ""}
          <small>
            {f.side === "cloud" ? "Only the cloud model got this one wrong." : f.side === "both" ? "Both models got this one wrong." : "Only Chrome's model got this one wrong."}{" "}
            {decidedByCode ? "Checked by code." : "Judged by the cloud model."}
          </small>
        </p>
      </div>
      <div className="side cloud">
        <p className="badge" data-source="in_cloud">{SOURCE_LABEL.in_cloud}</p>
        <p className="who">The cloud model answered</p>
        <RunAnswer run={r.cloud} check={f.cloud} telling={telling} size={size}>
          {f.cloud && !f.cloud.ok && f.side === "both" && <p className="quiet">{f.cloud.reason}</p>}
        </RunAnswer>
      </div>
    </section>
  );
}

function BottomLine({ verdicts, allowed, afterFixes }: { verdicts: Verdict[]; allowed: number; afterFixes: number }) {
  const [requests, setRequests] = useState(100_000);
  const [share, setShare] = useState(30);
  const onDevice = verdicts.filter((v) => v.kind === "device");
  const seconds = onDevice.map((v) => v.deviceSeconds ?? 0).sort((a, b) => a - b);
  const fastest = seconds[0]?.toFixed(1), slowest = seconds.at(-1)?.toFixed(1);
  const saved = onDevice.reduce((sum, v) => sum + dollarsPerRequest(v), 0) * requests * (share / 100);
  return (
    <section className="bottom">
      <h2>
        {barInWords(allowed)}, {onDevice.length} of {verdicts.length} features can run on your users' own devices
        {afterFixes > onDevice.length ? ` today, and ${afterFixes} of ${verdicts.length} after one-line fixes.` : "."}
      </h2>
      {onDevice.length > 0 && (
        <p className="gains">
          Those requests <b>never leave the device</b>, <b>work offline</b> and <b>answer in {fastest === slowest ? fastest : `${fastest} to ${slowest}`} s</b>.
        </p>
      )}
      <p className="money">
        At{" "}
        <input type="number" min={0} step={10000} value={requests} onChange={(e) => setRequests(Number(e.target.value))} aria-label="Requests a month for each feature" />{" "}
        requests a month for each feature, with{" "}
        <input type="number" min={0} max={100} value={share} onChange={(e) => setShare(Number(e.target.value))} aria-label="Share of users whose device has the model" />
        % of your users on a device that has the model, the cloud bill drops by about <b>${saved.toFixed(2)} a month</b>, at {CLOUD_MODEL}'s
        published price and the token counts measured here.
      </p>
    </section>
  );
}

function App() {
  const [features, setFeatures] = useState<Record<string, Cases>>(RECORD.features);
  const [mine, setMine] = useState<string[]>([]);
  const [running, setRunning] = useState<string>();
  const [device, setDevice] = useState<DeviceState>();
  const [notice, setNotice] = useState<string>();
  // Opens on the address feature: its dropped house number is the plainest proof on the page.
  const [selected, setSelected] = useState<string | undefined>("email_address");
  const [allowed, setAllowed] = useState(DEFAULT_ALLOWED);
  const stop = useRef(false);

  useEffect(() => {
    deviceState().then(setDevice);
  }, []);

  const put = (id: string) => (cases: Cases) => setFeatures((all) => ({ ...all, [id]: cases }));
  const verdicts = FEATURES.map((f) => verdictFor(f, features[f.id], allowed));
  const onDevice = verdicts.filter((v) => v.kind === "device"), inCloud = verdicts.filter((v) => v.kind === "cloud");
  const neither = verdicts.filter((v) => v.kind !== "device" && v.kind !== "cloud");

  // A feature that changes sides is seen crossing the line.
  function setBar(next: number) {
    const sides = (bar: number) => FEATURES.map((f) => verdictFor(f, features[f.id], bar).kind).join();
    if (!document.startViewTransition || sides(next) === sides(allowed)) return setAllowed(next);
    document.startViewTransition(() => flushSync(() => setAllowed(next)));
  }
  const shown = verdicts.find((v) => v.feature.id === selected) ?? verdicts.find((v) => v.kind === "cloud") ?? verdicts.find((v) => v.failures.length) ?? verdicts[0];

  async function gradeOrSay(f: Feature, cases: Cases): Promise<Cases> {
    try {
      return await gradeFeature(f, cases);
    } catch (e) {
      if (!(e instanceof OutOfRequests)) throw e;
      setNotice(`${e.message} "${f.name}" needs the cloud model to judge its answers, so it waits. Everything checked by code is done.`);
      return cases;
    }
  }

  async function runHere() {
    stop.current = false;
    setNotice(undefined);
    for (const f of FEATURES) {
      setRunning(f.id);
      const withoutDevice = Object.fromEntries(Object.entries(RECORD.features[f.id] ?? {}).map(([id, r]) => [id, { ...r, device: [] }]));
      put(f.id)(withoutDevice);
      const cases = await runDevice(f, withoutDevice, put(f.id), () => stop.current);
      if (stop.current) {
        put(f.id)(RECORD.features[f.id]);
        break;
      }
      put(f.id)(await gradeOrSay(f, cases));
      setMine((ids) => [...new Set([...ids, f.id])]);
    }
    setRunning(undefined);
  }

  // Dev only: makes the recorded check. It keeps what it has after every feature, so a run cut short by the free tier's day picks up where it stopped.
  async function recordEverything() {
    const all: Record<string, Cases> = JSON.parse(sessionStorage.getItem("partial") ?? "{}");
    setFeatures(all);
    for (const f of FEATURES) {
      setRunning(f.id);
      let cases = await runDevice(f, all[f.id] ?? {}, put(f.id), () => false);
      cases = await runCloud(f, cases, put(f.id));
      cases = await gradeFeature(f, cases);
      put(f.id)(cases);
      all[f.id] = cases;
      sessionStorage.setItem("partial", JSON.stringify(all));
    }
    setRunning(undefined);
    const record: CheckRecord = {
      machine: import.meta.env.VITE_RECORD_MACHINE ?? "",
      chrome: chromeVersion(),
      date: new Date().toISOString().slice(0, 10),
      cloudModel: CLOUD_MODEL,
      features: all,
    };
    sessionStorage.setItem("record", JSON.stringify(record));
  }

  // Dev only: for each feature the default bar keeps in the cloud, records the held-back inputs as they stand, the line the cloud
  // model proposes from the failures, and our own line where we have one. It resumes like the main recording.
  async function recordFixes() {
    const held: Record<string, Cases> = JSON.parse(sessionStorage.getItem("partial-held") ?? "null") ?? RECORD.held ?? {};
    const fixes: Record<string, FixRecord[]> = JSON.parse(sessionStorage.getItem("partial-fixes") ?? "null") ?? {};
    const keep = () => {
      sessionStorage.setItem("partial-held", JSON.stringify(held));
      sessionStorage.setItem("partial-fixes", JSON.stringify(fixes));
    };
    for (const f of FEATURES) {
      const v = verdictFor(f, RECORD.features[f.id]);
      if (v.kind !== "cloud" || !f.heldBack) continue;
      setRunning(f.id);
      const heldFeature = heldBackOf(f);
      held[f.id] = await gradeFeature(heldFeature, await runCloud(heldFeature, await runDevice(heldFeature, held[f.id] ?? {}, () => {}, () => false), () => {}));
      keep();
      fixes[f.id] ??= [];
      if (!fixes[f.id].some((fix) => fix.by === "cloud")) {
        const misses = v.failures.flatMap((x) => {
          const run = RECORD.features[f.id][x.c.id].device.find((d, i) => !x.device[i].ok);
          const check = x.device.find((d) => !d.ok);
          return run && check && !check.ok ? [{ input: x.c.input, answer: "text" in run ? run.text : run.error, reason: check.reason }] : [];
        });
        fixes[f.id].push({ line: await proposeLine(f, misses), by: "cloud", cases: {}, held: {} });
        keep();
      }
      if (OUR_LINES[f.id] && !fixes[f.id].some((fix) => fix.by === "us")) fixes[f.id].push({ line: OUR_LINES[f.id], by: "us", cases: {}, held: {} });
      for (const fix of fixes[f.id]) {
        if (Object.keys(fix.held).length && Object.values(fix.held).every((r) => r.cloud)) continue;
        Object.assign(fix, await tryLine(f, fix.line, () => {}, true));
        keep();
      }
    }
    setRunning(undefined);
    sessionStorage.setItem("record", JSON.stringify({ ...RECORD, held, fixes }));
  }

  const date = new Date(RECORD.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const runningName = FEATURES.find((f) => f.id === running)?.name;
  const done = running ? Object.values(features[running] ?? {}).filter((r) => r.device.length === RUNS).length : 0;

  return (
    <main className="check">
      <header>
        <h1>
          <i />
          Device or Cloud
        </h1>
        <p>
          <a href="/shop/">Larkfield shop</a> · {FEATURES.length} AI features
        </p>
        <p className="quiet">
          {mine.length === FEATURES.length
            ? `Run on this computer just now, Chrome ${chromeVersion()}`
            : `Recorded on a ${RECORD.machine}, Chrome ${RECORD.chrome}, ${date}`}
        </p>
        {running ? (
          <button onClick={() => (stop.current = true)}>
            Stop · {runningName}: {done} of {FEATURES.find((f) => f.id === running)!.cases.length}
          </button>
        ) : (
          <button onClick={runHere} disabled={device !== "available"}>
            Run it on your own computer
          </button>
        )}
        {import.meta.env.DEV && !running && <button onClick={recordEverything}>Record everything</button>}
        {import.meta.env.DEV && !running && <button onClick={recordFixes}>Record the fixes</button>}
      </header>

      {device && <DownloadPanel state={device} onState={setDevice} meanwhile="nothing below ran here" />}
      {notice && <p className="notice">{notice}</p>}

      <section className="intro">
        <h2>Which of an app's AI features can run on its users' own devices?</h2>
        <p className="lede">
          Each of the shop's eight features was sent {FEATURES[0].cases.length} inputs through Firebase AI Logic: {RUNS} times to the model built into
          Chrome, once to {RECORD.cloudModel || CLOUD_MODEL} in the cloud. A feature runs on the device when Chrome's model stays within the bar you set.
          It stays in the cloud when only the cloud does, and its prompt needs fixing when neither does.
        </p>
      </section>

      <div className="board">
        <label className="bar">
          Wrong answers allowed in 100
          <input type="range" min={0} max={30} value={allowed} onChange={(e) => setBar(Number(e.target.value))} />
          <output>{allowed}</output>
        </label>

        <div className="sides">
          <section className="side device">
            <h2>
              <b>{onDevice.length}</b> <span>run on the device</span>
            </h2>
            <ul>
              {onDevice.map((v) => (
                <FeatureRow key={v.feature.id} v={v} allowed={allowed} mine={mine.includes(v.feature.id)} selected={shown === v} onSelect={() => setSelected(v.feature.id)} />
              ))}
            </ul>
            {onDevice.length === 0 && <p className="none">Nothing yet. At this bar, Chrome's model is wrong too often on every feature.</p>}
          </section>
          <section className="side cloud">
            <h2>
              <b>{inCloud.length}</b> <span>stay in the cloud</span>
            </h2>
            <ul>
              {inCloud.map((v) => (
                <FeatureRow key={v.feature.id} v={v} allowed={allowed} mine={mine.includes(v.feature.id)} selected={shown === v} onSelect={() => setSelected(v.feature.id)} />
              ))}
            </ul>
            {inCloud.length === 0 && <p className="none">Nothing has to stay here at this bar.</p>}
          </section>
        </div>

        {neither.length > 0 && (
          <section className="neither">
            <h2>
              <b>{neither.length}</b> <span>on neither side yet</span>
            </h2>
            <ul>
              {neither.map((v) => (
                <FeatureRow key={v.feature.id} v={v} allowed={allowed} named mine={mine.includes(v.feature.id)} selected={shown === v} onSelect={() => setSelected(v.feature.id)} />
              ))}
            </ul>
          </section>
        )}

        <Proof v={shown} cases={features[shown.feature.id] ?? {}} />
        {shown.kind === "cloud" && RECORD.held?.[shown.feature.id] && (
          <Fixes feature={shown.feature} base={features[shown.feature.id]} record={RECORD} allowed={allowed} canRun={device === "available" && !running} />
        )}
      </div>
      <BottomLine
        verdicts={verdicts}
        allowed={allowed}
        afterFixes={verdicts.filter((v) => v.kind === "device" || (v.kind === "cloud" && RECORD.fixes?.[v.feature.id]?.some((fix) => moves(v.feature, fix, allowed)))).length}
      />

      <footer>
        <p>
          Code decides wherever an input has one right answer. Two features, the product title and the delivery note, have none, so the cloud model
          judges what code can't. On 69 answers we labelled by hand it agreed with us on 59 to 62, and in each run it passed 1 or 2 of the 20 answers we
          had marked clearly wrong.
        </p>
        <p>
          Running the check again here sends those two features' answers to Google's free Gemini tier to be judged. Google may use what is sent to
          that tier to improve its products. Everything Chrome's model does stays on this computer.
        </p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
