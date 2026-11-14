import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../base.css";
import { FEATURES, type Feature } from "../features";
import { DownloadPanel } from "../download";
import { CLOUD_MODEL, deviceState, type DeviceState } from "../firebase";
import { OutOfRequests, outOfRequests } from "./ask";
import { Board } from "./board";
import { heldBackOf, missesOf, OUR_LINES, proposeLine, tryLine } from "./fix";
import recorded from "./recorded.json";
import { RUNS, verdictFor, whereApple, type CheckRecord, type FixRecord } from "./record";
import { gradeFeature, runCloud, runDevice, type Cases } from "./run";

const RECORD = recorded as CheckRecord;
const chromeVersion = () => /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? "?";

function App() {
  const [features, setFeatures] = useState<Record<string, Cases>>(RECORD.features);
  const [mine, setMine] = useState<string[]>([]);
  const [running, setRunning] = useState<string>();
  const [device, setDevice] = useState<DeviceState>();
  const [notice, setNotice] = useState<string>();
  const stop = useRef(false);

  useEffect(() => {
    deviceState().then(setDevice);
  }, []);

  const put = (id: string) => (cases: Cases) => setFeatures((all) => ({ ...all, [id]: cases }));

  async function gradeOrSay(f: Feature, cases: Cases): Promise<Cases> {
    try {
      return await gradeFeature(f, cases);
    } catch (e) {
      if (!(e instanceof OutOfRequests)) throw e;
      setNotice(`${outOfRequests(e)} "${f.name}" needs the cloud model to judge its answers, so it waits. Everything checked by code is done.`);
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
        fixes[f.id].push({ line: await proposeLine(f, missesOf(f, RECORD.features[f.id])), by: "cloud", cases: {}, held: {} });
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

  // Dev only: has the cloud model judge the free-text answers that have no verdict yet, as Apple's have after `npm run apple`.
  async function gradeNew() {
    const all = { ...RECORD.features }, held = { ...RECORD.held };
    for (const f of FEATURES) {
      setRunning(f.id);
      all[f.id] = await gradeFeature(f, all[f.id]);
      if (held[f.id]) held[f.id] = await gradeFeature(heldBackOf(f), held[f.id]);
    }
    setRunning(undefined);
    sessionStorage.setItem("record", JSON.stringify({ ...RECORD, features: all, held }));
  }

  const date = new Date(RECORD.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const runningName = FEATURES.find((f) => f.id === running)?.name;
  const done = running ? Object.values(features[running] ?? {}).filter((r) => r.device.length === RUNS).length : 0;

  return (
    <main className="check sample">
      <header>
        <h1>
          <i />
          Device or Cloud
        </h1>
        <p>
          <a href="/shop/">Larkfield shop</a> · {FEATURES.length} AI features · <a href="/own/">Check your own prompts</a>
        </p>
        <p className="quiet">
          {mine.length === FEATURES.length
            ? `Run on this computer just now, Chrome ${chromeVersion()}`
            : `Recorded on ${RECORD.machine}, Chrome ${RECORD.chrome}, ${date}`}
        </p>
        {running ? (
          <button onClick={() => (stop.current = true)}>
            Stop · {runningName}: {done} of {FEATURES.find((f) => f.id === running)!.cases.length}
          </button>
        ) : (
          device !== "unsupported" && (
            <button onClick={runHere} disabled={device !== "available"}>
              Run it on your own computer
            </button>
          )
        )}
        {import.meta.env.DEV && !running && <button onClick={recordEverything}>Record everything</button>}
        {import.meta.env.DEV && !running && <button onClick={recordFixes}>Record the fixes</button>}
        {import.meta.env.DEV && !running && <button onClick={gradeNew}>Grade what's new</button>}
      </header>

      {notice && <p className="notice">{notice}</p>}

      <section className="intro">
        <h2>Find out which of your app's AI features Chrome's <span className="together">built-in</span> model gets right, measured on your own inputs, and ship the answer as Remote Config.</h2>
        <p className="lede">
          This is a sample shop's check. Each of its eight features was sent {FEATURES[0].cases.length} inputs through Firebase AI Logic: {RUNS} times to the model built into
          Chrome, {RECORD.apple && `${RUNS} times to Apple's on-device model in the shop's iPhone app, `}once to {RECORD.cloudModel || CLOUD_MODEL} in the cloud. A feature
          runs on the device when {RECORD.apple ? "its platform's own model" : "Chrome's model"} stays within the bar you set. It stays in the cloud when only the cloud does.
          When neither does, neither model is good enough for it.
        </p>
      </section>

      {/* Opens on the address feature: its dropped house number is the plainest proof on the page. */}
      <Board
        features={FEATURES}
        cases={features}
        mine={mine}
        recordedOn="our laptop"
        held={RECORD.held}
        fixes={RECORD.fixes}
        opensOn="email_address"
        canRun={device === "available" && !running}
        below={
          device && (
            <DownloadPanel
              state={device}
              onState={setDevice}
              now="Everything above was recorded on our laptop."
              toGetIt="To run it on yours, Chrome downloads its built-in model once: about 4 GB, 12 minutes on ours."
            />
          )
        }
        belowOnIphone={
          RECORD.apple && (
            <aside className="download">
              <p>{whereApple(RECORD.apple)} To run it on your own iPhone, open the shop's app and its Check tab.</p>
            </aside>
          )
        }
      >
        <p>
          <a href="/shop/">The Larkfield shop</a> runs on this template as it stands at the default bar of 10: we deployed it from the recorded
          check, and each of the shop's features reads its mode from it.
        </p>
      </Board>

      <footer>
        <p>
          Code decides wherever an input has one right answer. Two features, the product title and the delivery note, have none, so the cloud model
          judges what code can't: its own answers as well as Chrome's model's.{" "}
          <a href="/results/">Every input and every answer of this record</a> is on one page, misses included.
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
