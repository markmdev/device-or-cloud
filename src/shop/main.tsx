import { activate, fetchAndActivate, getRemoteConfig, getString, onConfigUpdate } from "firebase/remote-config";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SOURCE_LABEL } from "../answer";
import "../base.css";
import { ask, type Answer } from "../check/ask";
import { DownloadPanel } from "../download";
import { FEATURES, type Feature } from "../features";
import { app, deviceState, MODES, type DeviceState, type Mode } from "../firebase";
import { Result, SHOWN } from "./present";

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 5 * 60_000;
remoteConfig.defaultConfig = Object.fromEntries(FEATURES.map((f) => [`mode_${f.id}`, "only_in_cloud"]));

function modes(): Record<string, Mode> {
  return Object.fromEntries(
    FEATURES.map((f) => {
      const value = getString(remoteConfig, `mode_${f.id}`) as Mode;
      return [f.id, MODES.includes(value) ? value : "only_in_cloud"];
    }),
  );
}

const ON_DEVICE: Mode[] = ["prefer_on_device", "only_on_device"];

function Card({ feature, mode, device }: { feature: Feature; mode: Mode; device?: DeviceState }) {
  const shown = SHOWN[feature.id];
  const [input, setInput] = useState(feature.cases[0].input);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer>();
  const [problem, setProblem] = useState<string>();

  async function run() {
    setBusy(true);
    setAnswer(undefined);
    setProblem(undefined);
    try {
      setAnswer(await ask(feature, mode, input));
    } catch (e) {
      setProblem(navigator.onLine ? (e instanceof Error ? e.message : String(e)) : "This feature runs in the cloud, so it needs a connection.");
    }
    setBusy(false);
  }

  const source = answer?.source;
  const where = source ?? (ON_DEVICE.includes(mode) ? "on_device" : "in_cloud");
  // What a card says before it has answered: where it is set to run, and what that means on this computer.
  const [set, means] =
    where === "in_cloud" ? ["Set to run in the cloud", "needs a connection"]
    : device === "available" ? ["Set to run on this computer", "works offline"]
    : device === "downloadable" || device === "downloading" ? ["Set to run on this computer once Chrome's model is here", "in the cloud until then"]
    : ["Set to run on a computer that has Chrome's model", "in the cloud here"];
  return (
    <article className="card" data-feature={feature.id}>
      <p className="label">{shown.label}</p>
      <h2>{shown.heading}</h2>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={Math.min(8, input.split("\n").length + 2)} />
      <p className="actions">
        <button onClick={run} disabled={busy || !input.trim()}>
          {shown.button}
        </button>
      </p>
      <div className="result" aria-live="polite">
        {busy && <p className="quiet">Working…</p>}
        {answer && <Result feature={feature} text={answer.text} />}
        {problem && <p className="wrong">{problem}</p>}
      </div>
      <p className="badge" data-source={where} data-ran={Boolean(source)}>
        <span>{source ? SOURCE_LABEL[source] : set}</span>
        <span>{answer ? `${answer.seconds.toFixed(1)} s · ${source === "on_device" ? "works offline" : "needs a connection"}` : means}</span>
      </p>
    </article>
  );
}

function Shop() {
  // Empty until Remote Config has answered, so no feature runs on a setting older than the published one.
  const [mode, setMode] = useState<Record<string, Mode>>();
  const [device, setDevice] = useState<DeviceState>();

  useEffect(() => {
    deviceState().then(setDevice);
    fetchAndActivate(remoteConfig).catch(() => {}).then(() => setMode(modes()));
    return onConfigUpdate(remoteConfig, {
      next: () => void activate(remoteConfig).then(() => setMode(modes())),
      error: () => {},
      complete: () => {},
    });
  }, []);

  return (
    <main className="shop">
      <header>
        <h1>Larkfield</h1>
        <p>
          A made-up home and garden shop with eight AI features. Each one reads where to run from Firebase Remote Config, set from{" "}
          <a href="/">the check's verdicts</a>, and says where its answer ran.
        </p>
        <p className="quiet">
          What you type into a feature that runs in the cloud goes to Google's free Gemini tier, and Google may use it to improve its products. A
          feature that runs on this computer sends nothing.
        </p>
      </header>
      {device && (
        <DownloadPanel
          state={device}
          onState={setDevice}
          now="Without Chrome's built-in model, every feature here runs in the cloud."
          toGetIt="To run the device features on this computer, Chrome downloads it once: about 4 GB, 12 minutes on our laptop."
        />
      )}
      <div className="cards">
        {mode && FEATURES.map((f) => <Card key={f.id} feature={f} mode={mode[f.id]} device={device} />)}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Shop />);
