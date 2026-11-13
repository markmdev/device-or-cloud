import { InferenceSource, type GenerativeModel } from "firebase/ai";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { inCloud, onDevice } from "./firebase";
import "./style.css";

type Answer = { text: string; source?: string; seconds: number } | { error: string };
type DeviceState = "checking" | "unsupported" | "unavailable" | "downloadable" | "downloading" | "available";

const SOURCE_LABEL: Record<string, string> = {
  [InferenceSource.ON_DEVICE]: "Ran on this computer",
  [InferenceSource.IN_CLOUD]: "Ran in the cloud",
};

async function ask(model: GenerativeModel, prompt: string): Promise<Answer> {
  const started = performance.now();
  try {
    const { response } = await model.generateContent(prompt);
    return { text: response.text(), source: response.inferenceSource, seconds: (performance.now() - started) / 1000 };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function deviceState(): Promise<DeviceState> {
  if (typeof LanguageModel === "undefined") return "unsupported";
  return LanguageModel.availability();
}

function AnswerCard({ title, answer, busy }: { title: string; answer?: Answer; busy: boolean }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {busy && <p className="quiet">Waiting for the answer…</p>}
      {answer && "error" in answer && <p className="error">{answer.error}</p>}
      {answer && "text" in answer && (
        <>
          <p className="badge" data-source={answer.source}>
            {SOURCE_LABEL[answer.source ?? ""] ?? "The SDK didn't say where this ran"} · {answer.seconds.toFixed(1)} s
          </p>
          <p className="answer">{answer.text}</p>
        </>
      )}
    </section>
  );
}

function App() {
  const [prompt, setPrompt] = useState(
    "Sort this support message into one of: billing, delivery, returns, other. Answer with the one word.\n\nMy parcel says delivered but nothing has arrived.",
  );
  const [device, setDevice] = useState<DeviceState>("checking");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [deviceAnswer, setDeviceAnswer] = useState<Answer>();
  const [cloudAnswer, setCloudAnswer] = useState<Answer>();

  useEffect(() => {
    deviceState().then(setDevice);
  }, []);

  async function download() {
    setDevice("downloading");
    try {
      await onDevice.initializeDeviceModel(setProgress);
    } finally {
      setDevice(await deviceState());
    }
  }

  async function run() {
    setBusy(true);
    setDeviceAnswer(undefined);
    setCloudAnswer(undefined);
    await Promise.all([
      device === "available" ? ask(onDevice, prompt).then(setDeviceAnswer) : undefined,
      ask(inCloud, prompt).then(setCloudAnswer),
    ]);
    setBusy(false);
  }

  return (
    <main>
      <h1>Device or Cloud</h1>
      <p className="quiet">
        One prompt, answered twice through Firebase AI Logic: once by the model built into this Chrome, once by Gemini
        in the cloud.
      </p>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} />
      <button onClick={run} disabled={busy || !prompt.trim()}>
        Run it
      </button>

      {device === "unsupported" && (
        <p className="notice">This browser has no built-in model. Open the page in Chrome on a computer to see the device side.</p>
      )}
      {device === "unavailable" && <p className="notice">This computer can't run Chrome's built-in model.</p>}
      {device === "downloadable" && (
        <p className="notice">
          Chrome's built-in model isn't on this computer yet. It's a download of about 4 GB.{" "}
          <button className="link" onClick={download}>
            Download it
          </button>
        </p>
      )}
      {device === "downloading" && (
        <p className="notice">Downloading Chrome's built-in model: {Math.round(progress * 100)}%</p>
      )}

      <div className="pair">
        <AnswerCard title="On this computer" answer={deviceAnswer} busy={busy && device === "available" && !deviceAnswer} />
        <AnswerCard title="In the cloud" answer={cloudAnswer} busy={busy && !cloudAnswer} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
