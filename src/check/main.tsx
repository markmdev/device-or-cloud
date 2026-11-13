import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnswerText, SOURCE_LABEL } from "../answer";
import "../base.css";
import { FEATURES, type Check, type Feature } from "../features";
import { DownloadPanel } from "../download";
import { CLOUD_MODEL, deviceState, type DeviceState } from "../firebase";
import { OutOfRequests } from "./ask";
import recorded from "./recorded.json";
import { barInWords, DEFAULT_ALLOWED, dollarsPerRequest, RUNS, VERDICT_NAME, verdictFor, verdictLine, type CheckRecord, type Failure, type Run, type Verdict } from "./record";
import { gradeFeature, runCloud, runDevice, type Cases } from "./run";

const RECORD = recorded as CheckRecord;
const chromeVersion = () => /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? "?";

function FeatureRow({ v, mine, selected, onSelect }: { v: Verdict; mine: boolean; selected: boolean; onSelect: () => void }) {
  return (
    <li>
      <button className="feature" data-verdict={v.kind} aria-pressed={selected} onClick={onSelect}>
        <strong>{v.feature.name}</strong>
        <span>
          <b>{VERDICT_NAME[v.kind]}</b> {verdictLine(v)}
        </span>
        {mine && <small>Run on this computer just now</small>}
      </button>
    </li>
  );
}

function RunAnswer({ run, check }: { run?: Run; check?: Check }) {
  if (!run) return <p className="quiet">No answer yet.</p>;
  return (
    <>
      {"error" in run ? <p className="answer">{run.error}</p> : <AnswerText text={run.text} />}
      {check && !check.ok && <p className="wrong">{check.reason}</p>}
      {check?.ok && <p className="right">Right.</p>}
    </>
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
  const f: Failure = v.failures[Math.min(at, v.failures.length - 1)];
  const r = cases[f.c.id];
  const worst = Math.max(0, f.device.findIndex((d) => !d.ok));
  const run = r.device[worst];
  const wrongRuns = f.device.filter((d) => !d.ok).length;
  const sameText = new Set(r.device.map((d) => ("text" in d ? d.text : d.error))).size === 1;
  const decidedByCode = !v.feature.graded || !v.feature.check("text" in run ? run.text : "", f.c).ok;
  return (
    <section className="proof">
      <div className="side device">
        <p className="badge" data-source="on_device">
          {SOURCE_LABEL.on_device}
          {"seconds" in run && ` · ${run.seconds.toFixed(1)} s`}
        </p>
        <RunAnswer run={run} check={f.device[worst]} />
        <p className="quiet">
          {wrongRuns === 0 ? `Right on all ${RUNS} runs.` : sameText ? `The same answer on all ${RUNS} runs.` : `Wrong on ${wrongRuns} of ${RUNS} runs.`}
        </p>
      </div>
      <div className="input">
        <p className="quiet">
          {v.feature.name} · input {v.feature.cases.indexOf(f.c) + 1} of {v.inputs}
          <span className="pager">
            <button onClick={() => setAt((at + v.failures.length - 1) % v.failures.length)} aria-label="Previous">‹</button>
            {Math.min(at, v.failures.length - 1) + 1} of {v.failures.length}
            <button onClick={() => setAt((at + 1) % v.failures.length)} aria-label="Next">›</button>
          </span>
        </p>
        <pre>{f.c.input}</pre>
        <p className="quiet">
          {f.side === "cloud" ? "Only the cloud model got this one wrong." : f.side === "both" ? "Both models got this one wrong." : "Only Chrome's model got this one wrong."}{" "}
          {decidedByCode ? "Checked by code." : "Judged by the cloud model."}
        </p>
      </div>
      <div className="side cloud">
        <p className="badge" data-source="in_cloud">{SOURCE_LABEL.in_cloud}</p>
        <RunAnswer run={r.cloud} check={f.cloud} />
      </div>
    </section>
  );
}

function BottomLine({ verdicts, allowed }: { verdicts: Verdict[]; allowed: number }) {
  const [requests, setRequests] = useState(100_000);
  const [share, setShare] = useState(30);
  const onDevice = verdicts.filter((v) => v.kind === "device");
  const seconds = onDevice.map((v) => v.deviceSeconds ?? 0).sort((a, b) => a - b)[Math.floor(onDevice.length / 2)];
  const saved = onDevice.reduce((sum, v) => sum + dollarsPerRequest(v), 0) * requests * (share / 100);
  return (
    <section className="bottom">
      <h2>
        {barInWords(allowed)}, {onDevice.length} of {verdicts.length} features can run on your users' own devices.
      </h2>
      {onDevice.length > 0 && (
        <p className="gains">
          Those requests <b>never leave the device</b>, <b>work offline</b> and <b>answer in {seconds.toFixed(1)} s</b>.
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
  const [selected, setSelected] = useState<string>();
  const [allowed, setAllowed] = useState(DEFAULT_ALLOWED);
  const stop = useRef(false);

  useEffect(() => {
    deviceState().then(setDevice);
  }, []);

  const put = (id: string) => (cases: Cases) => setFeatures((all) => ({ ...all, [id]: cases }));
  const verdicts = FEATURES.map((f) => verdictFor(f, features[f.id], allowed));
  const shown = verdicts.find((v) => v.feature.id === selected) ?? verdicts.find((v) => v.failures.length) ?? verdicts[0];

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

  const date = new Date(RECORD.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const runningName = FEATURES.find((f) => f.id === running)?.name;
  const done = running ? Object.values(features[running] ?? {}).filter((r) => r.device.length === RUNS).length : 0;

  return (
    <main className="check">
      <header>
        <h1>Device or Cloud</h1>
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
      </header>

      {device && <DownloadPanel state={device} onState={setDevice} meanwhile="nothing below ran here" />}
      {notice && <p className="notice">{notice}</p>}

      <p className="lede">
        Which of an app's AI features can run on its users' own devices? Each of the shop's eight features was sent {FEATURES[0].cases.length} inputs
        through Firebase AI Logic: {RUNS} times to the model built into Chrome, once to {RECORD.cloudModel || CLOUD_MODEL} in the cloud. A feature runs on
        the device when Chrome's model stays within the bar you set. It stays in the cloud when only the cloud does, and its prompt needs fixing when
        neither does.
      </p>

      <label className="bar">
        Wrong answers allowed in 100
        <input type="range" min={0} max={30} value={allowed} onChange={(e) => setAllowed(Number(e.target.value))} />
        <output>{allowed}</output>
      </label>

      <div className="sides">
        <section className="side device">
          <h2>
            <b>{verdicts.filter((v) => v.kind === "device").length}</b> run on the device
          </h2>
          <ul>
            {verdicts.filter((v) => v.kind === "device").map((v) => (
              <FeatureRow key={v.feature.id} v={v} mine={mine.includes(v.feature.id)} selected={shown === v} onSelect={() => setSelected(v.feature.id)} />
            ))}
          </ul>
        </section>
        <section className="side cloud">
          <h2>
            <b>{verdicts.filter((v) => v.kind !== "device").length}</b> stay in the cloud
          </h2>
          <ul>
            {verdicts.filter((v) => v.kind !== "device").map((v) => (
              <FeatureRow key={v.feature.id} v={v} mine={mine.includes(v.feature.id)} selected={shown === v} onSelect={() => setSelected(v.feature.id)} />
            ))}
          </ul>
        </section>
      </div>

      <Proof v={shown} cases={features[shown.feature.id] ?? {}} />
      <BottomLine verdicts={verdicts} allowed={allowed} />

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
