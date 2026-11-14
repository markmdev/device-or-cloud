import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../base.css";
import { FEATURES, type Feature } from "../features";
import { DownloadPanel } from "../download";
import { CLOUD_MODEL, deviceState, type DeviceState } from "../firebase";
import { OutOfRequests, outOfRequests } from "./ask";
import { Board } from "./board";
import { heldBackOf, missesOf, proposeLine, withLine } from "./fix";
import { APPLE_LINES, OUR_LINES } from "./lines";
import recorded from "./recorded.json";
import { onApple, RUNS, verdictFor, whereApple, written, type CheckRecord, type FixRecord } from "./record";
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
  const [iphone, setIphone] = useState(false);

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

  // Dev only: makes the recorded check, or adds to it what it still lacks: answers to new inputs, the held-back inputs, each
  // line's runs, the cloud model's judgments. Everything Chrome's model does comes first, because it is free. The cloud side
  // follows, and a run cut short by the free tier's day keeps what it has and goes on from there the next time.
  async function recordEverything() {
    const kept: Pick<CheckRecord, "features" | "held" | "fixes"> = JSON.parse(sessionStorage.getItem("partial") ?? "null") ?? RECORD;
    const all = { ...kept.features }, held = { ...kept.held }, fixes: Record<string, FixRecord[]> = structuredClone(kept.fixes ?? {});
    const save = () => sessionStorage.setItem("partial", JSON.stringify({ features: all, held, fixes }));
    const quietly = () => {}, never = () => false;
    setFeatures(all);
    const fixable = FEATURES.filter((f) => f.heldBack);
    const lined = (f: Feature, fix: FixRecord) => (fix.line ? withLine(f, fix.line) : f);
    // Apple's runs of a line come from the iPhone app (scripts/apple.ts); Chrome's are made here.
    async function onChrome(f: Feature, fix: FixRecord) {
      if (fix.on) return;
      fix.cases = await runDevice(lined(f, fix), fix.cases, quietly, never);
      fix.held = await runDevice(heldBackOf(lined(f, fix)), fix.held, quietly, never);
      save();
    }

    for (const f of FEATURES) {
      setRunning(f.id);
      all[f.id] = await runDevice(f, all[f.id] ?? {}, put(f.id), never);
      save();
    }
    for (const f of fixable) {
      setRunning(f.id);
      held[f.id] = await runDevice(heldBackOf(f), held[f.id] ?? {}, quietly, never);
      fixes[f.id] ??= [];
      if (OUR_LINES[f.id] && !fixes[f.id].some((fix) => fix.by === "us" && !fix.on)) fixes[f.id].push({ line: OUR_LINES[f.id], by: "us", cases: {}, held: {} });
      for (const fix of fixes[f.id]) await onChrome(f, fix);
    }

    try {
      for (const f of FEATURES) {
        setRunning(f.id);
        all[f.id] = await gradeFeature(f, await runCloud(f, all[f.id], put(f.id)));
        put(f.id)(all[f.id]);
        save();
      }
      for (const f of fixable) {
        setRunning(f.id);
        held[f.id] = await gradeFeature(heldBackOf(f), await runCloud(heldBackOf(f), held[f.id], quietly));
        save();
        // The product's own fix step: the cloud model writes one line from what each on-device model got wrong.
        for (const on of [undefined, "apple"] as const) {
          const cases = on ? onApple(all[f.id]) : all[f.id], v = verdictFor(f, cases);
          const worthALine = v.kind === "cloud" || (v.kind === "device" && v.failures.some((x) => x.side !== "cloud"));
          if ((on && !APPLE_LINES.includes(f.id)) || !worthALine || fixes[f.id].some((fix) => fix.by === "cloud" && fix.on === on)) continue;
          fixes[f.id].push({ line: await proposeLine(f, missesOf(f, cases)), by: "cloud", on, cases: {}, held: {} });
          save();
        }
        for (const fix of fixes[f.id]) {
          await onChrome(f, fix);
          // The held-back inputs go to the cloud once with each line. A setting leaves the cloud's request as it was, and a line
          // tried on both on-device models is the same request, so those answers are taken over.
          const same = fix.steady ? held[f.id] : fixes[f.id].find((other) => other !== fix && other.line === fix.line && Object.values(other.held).some((r) => r.cloud))?.held;
          if (same) for (const c of f.heldBack!) if (same[c.id]?.cloud) fix.held[c.id] = { ...(fix.held[c.id] ?? { device: [] }), cloud: same[c.id].cloud };
          fix.held = await gradeFeature(heldBackOf(lined(f, fix)), await runCloud(heldBackOf(lined(f, fix)), fix.held, quietly));
          fix.cases = await gradeFeature(lined(f, fix), fix.cases);
          save();
        }
      }
    } catch (e) {
      if (!(e instanceof OutOfRequests)) throw e;
      setNotice(outOfRequests(e));
      return;
    } finally {
      setRunning(undefined);
    }
    const record: CheckRecord = {
      ...RECORD,
      machine: import.meta.env.VITE_RECORD_MACHINE ?? "",
      chrome: chromeVersion(),
      date: new Date().toISOString().slice(0, 10),
      cloudModel: CLOUD_MODEL,
      features: all,
      held,
      fixes,
    };
    sessionStorage.setItem("record", JSON.stringify(record));
  }

  const date = written(RECORD.date);
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
          {iphone && RECORD.apple
            ? `Recorded in the iPhone app on an iOS ${RECORD.apple.os} simulator, on our laptop's copy of Apple's model, ${written(RECORD.apple.date)}`
            : mine.length === FEATURES.length
              ? `Run on this computer just now, Chrome ${chromeVersion()}`
              : `Recorded on ${RECORD.machine}, Chrome ${RECORD.chrome}, ${date}`}
        </p>
        {running ? (
          <button onClick={() => (stop.current = true)}>
            Stop · {runningName}: {done} of {FEATURES.find((f) => f.id === running)!.cases.length}
          </button>
        ) : (
          device !== "unsupported" &&
          !iphone && (
            <button onClick={runHere} disabled={device !== "available"}>
              Run it on your own computer
            </button>
          )
        )}
        {import.meta.env.DEV && !running && <button onClick={recordEverything}>Record everything</button>}
      </header>

      {notice && <p className="notice">{notice}</p>}

      <section className="intro">
        {iphone ? (
          <h2>The same check, run inside the shop's iPhone app: which of its AI features Apple's <span className="together">on-device</span> model gets right, shipped in the same Remote Config template.</h2>
        ) : (
          <h2>Find out which of your app's AI features Chrome's <span className="together">built-in</span> model gets right, measured on your own inputs, and ship the answer as Remote Config.</h2>
        )}
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
        onPlatform={setIphone}
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
