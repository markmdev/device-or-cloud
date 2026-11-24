import { activate, fetchAndActivate, getRemoteConfig, getString, onConfigUpdate } from "firebase/remote-config";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SOURCE_LABEL } from "../answer";
import "../base.css";
import { ask, type Answer } from "../check/ask";
import { withLine } from "../check/fix";
import { DownloadPanel } from "../download";
import { FEATURES, type Feature } from "../features";
import { app, deviceState, MODES, type DeviceState, type Mode } from "../firebase";
import { Result, sampleOf, SHOWN } from "./present";

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 5 * 60_000;
remoteConfig.defaultConfig = Object.fromEntries(FEATURES.map((f) => [`mode_${f.id}`, "only_in_cloud"]));

/** What Remote Config gives a feature: its mode, and the line the check found it needs in that mode, if any. */
type Setting = { mode: Mode; line: string };

function settings(): Record<string, Setting> {
  return Object.fromEntries(
    FEATURES.map((f) => {
      const value = getString(remoteConfig, `mode_${f.id}`) as Mode;
      return [f.id, { mode: MODES.includes(value) ? value : "only_in_cloud", line: getString(remoteConfig, `line_${f.id}`) }];
    }),
  );
}

const ON_DEVICE: Mode[] = ["prefer_on_device", "only_on_device"];

function Card({ feature, mode, line, device }: { feature: Feature; device?: DeviceState } & Setting) {
  const shown = SHOWN[feature.id];
  const { added, text } = sampleOf(feature);
  const [input, setInput] = useState(text);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer>();
  const [problem, setProblem] = useState<string>();

  async function run() {
    setBusy(true);
    setAnswer(undefined);
    setProblem(undefined);
    try {
      setAnswer(await ask(line ? withLine(feature, line) : feature, mode, added + input));
    } catch (e) {
      setProblem(navigator.onLine ? (e instanceof Error ? e.message : String(e)) : "This feature runs in the cloud, so it needs a connection.");
    }
    setBusy(false);
  }

  const source = answer?.source;
  const where = source ?? (ON_DEVICE.includes(mode) ? "on_device" : "in_cloud");
  const fellBack =
    source === "in_cloud" && ON_DEVICE.includes(mode)
      ? device === "available" ? "Set to run on this computer, but Chrome's model didn't take it"
      : device === "downloadable" || device === "downloading" ? "Set to run on this computer once Chrome's model is here"
      : "Set to run on this computer, which has no Chrome model"
      : undefined;
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
      {added && <p className="adds">The shop adds its own line first: “{added.trim()}”</p>}
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
        <span>
          {source ? SOURCE_LABEL[source] : set}
          {line && where === "on_device" && <small>with one added line</small>}
          {fellBack && <small>{fellBack}</small>}
        </span>
        <span>{answer ? `${answer.seconds.toFixed(1)} s · ${source === "on_device" ? "works offline" : "needs a connection"}` : means}</span>
      </p>
    </article>
  );
}

function Shop() {
  // Empty until Remote Config has answered, so no feature runs on a setting older than the published one.
  const [setting, setSetting] = useState<Record<string, Setting>>();
  const [device, setDevice] = useState<DeviceState>();

  useEffect(() => {
    deviceState().then(setDevice);
    fetchAndActivate(remoteConfig).catch(() => {}).then(() => setSetting(settings()));
    return onConfigUpdate(remoteConfig, {
      next: () => void activate(remoteConfig).then(() => setSetting(settings())),
      error: () => {},
      complete: () => {},
    });
  }, []);

  const card = (id: string) => {
    const feature = FEATURES.find((f) => f.id === id)!;
    return setting && <Card feature={feature} {...setting[id]} device={device} />;
  };

  return (
    <main className="shop">
      <header>
        <h1>Larkfield</h1>
        <nav>
          <a href="#shears">Garden tools</a>
          <a href="#orders">Your orders</a>
          <a href="#more">Rewards, trade and selling</a>
        </nav>
      </header>
      <aside className="about">
        <p>
          A made-up home and garden shop with eight AI features. Each one reads where to run from Firebase Remote Config, set from{" "}
          <a href="/">the check's verdicts</a>, and says where its answer ran.
        </p>
        <p className="quiet">
          What you type into a feature that runs in the cloud goes to Google's free Gemini tier, and Google may use it to improve its products. A
          feature that runs on this computer sends nothing.
        </p>
      </aside>
      {device && (
        <DownloadPanel
          state={device}
          onState={setDevice}
          now="Without Chrome's built-in model, every feature here runs in the cloud."
          toGetIt="To run the device features on this computer, Chrome downloads it once: about 4 GB, 12 minutes on our laptop."
        />
      )}

      <section className="aisle product" id="shears">
        <div className="shelf">
          <Shears />
          <p className="label">Garden tools</p>
          <h2>Hedge shears, 25 cm blades</h2>
          <p className="price">£24.00</p>
          <p>Carbon steel blades and ash handles. Sharpened by hand before they leave us.</p>
        </div>
        <div className="said">
          <ul className="reviews">
            <li>
              <b>Priya</b> Went through a year of privet in an afternoon. The handles are a little long for me.
            </li>
            <li>
              <b>Tom</b> Sharp, light and well balanced. My old pair went in the shed.
            </li>
          </ul>
          {card("review_mood")}
        </div>
      </section>

      <section className="aisle" id="orders">
        <h2>Your orders</h2>
        <div className="orders">
          <div className="order">
            <p className="order-line">
              <Shears />
              <span>
                <b>Order #88406</b> Hedge shears, 25 cm blades
              </span>
              <i>On its way</i>
            </p>
            {card("email_address")}
            {card("delivery_summary")}
          </div>
          <div className="order">
            <p className="order-line">
              <Lamp />
              <span>
                <b>Order #88213</b> Desk lamp
              </span>
              <i>Delivered 9 November</i>
            </p>
            {card("returns_answer")}
            {card("ticket_route")}
          </div>
        </div>
      </section>

      <section className="aisle" id="more">
        <h2>Rewards, trade and selling</h2>
        <div className="cards">
          {card("receipt_fields")}
          {card("invoice_total")}
          {card("product_title")}
        </div>
      </section>
    </main>
  );
}

const drawn = { viewBox: "0 0 120 90", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function Shears() {
  return (
    <svg className="drawn" {...drawn}>
      <path d="M57 56 L24 9 L67 47 Z" fill="currentColor" />
      <path d="M63 56 L96 9 L53 47 Z" fill="currentColor" />
      <path d="M55 60 L41 83 M65 60 L79 83" strokeWidth={8} />
      <circle cx="60" cy="50" r="2.5" stroke="var(--wash)" fill="var(--wash)" />
    </svg>
  );
}

function Lamp() {
  return (
    <svg className="drawn" {...drawn}>
      <path d="M34 80 H78" />
      <path d="M56 80 L46 46 L74 30" />
      <path d="M66 20 L92 34 L80 52 L60 38 Z" />
      <circle cx="46" cy="46" r="3.5" fill="currentColor" />
    </svg>
  );
}

createRoot(document.getElementById("root")!).render(<Shop />);
