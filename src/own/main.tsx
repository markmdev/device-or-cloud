import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../base.css";
import { OutOfRequests, outOfRequests } from "../check/ask";
import { Board } from "../check/board";
import { ENOUGH_INPUTS, RUNS, type FixRecord } from "../check/record";
import { gradeFeature, runCloud, runDevice, type Cases } from "../check/run";
import { DownloadPanel, whyNot } from "../download";
import { CLOUD_MODEL, deviceState, type DeviceState } from "../firebase";
import { blankFeature, blankInput, hasExpect, newId, problem, split, toFeature, type OwnFeature, type OwnInput } from "./feature";
import { writeInputs, WRITTEN } from "./write";

type Saved = { features: OwnFeature[]; answers: Record<string, Cases>; fixes: Record<string, FixRecord[]> };

const KEY = "own-check";

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (Array.isArray(saved.features) && saved.features.length) return saved;
  } catch {
    // Nothing kept yet, or not ours.
  }
  return { features: [blankFeature()], answers: {}, fixes: {} };
}

/** Two runs fill in the same inputs at once, each with its own half of every answer. */
function merge(into: Cases, from: Cases): Cases {
  const out = { ...into };
  for (const [id, r] of Object.entries(from)) {
    out[id] = { device: r.device.length ? r.device : (out[id]?.device ?? []), cloud: r.cloud ?? out[id]?.cloud, grades: { ...out[id]?.grades, ...r.grades } };
  }
  return out;
}

/** Cloud requests one feature's check uses: each input once, and a request for every 25 answers the cloud model judges. */
function cloudRequests(own: OwnFeature): number {
  const { inCheck, heldBack } = split(own);
  const judged = inCheck.filter((i) => !hasExpect(i)).length * (RUNS + 1) + heldBack.filter((i) => !hasExpect(i)).length * RUNS;
  return inCheck.length + Math.ceil(judged / 25);
}

function InputRow({ input, shaped, onChange, onRemove }: { input: OwnInput; shaped: boolean; onChange: (next: OwnInput) => void; onRemove: () => void }) {
  const written = input.by === "cloud";
  return (
    <li className="own-input" data-by={input.by} data-ticked={input.ticked}>
      {written && (
        <label className="tick" title="A real user could send this">
          <input type="checkbox" checked={input.ticked} onChange={(e) => onChange({ ...input, ticked: e.target.checked })} />
          <span>A real user could send this</span>
        </label>
      )}
      <label>
        <span>Input</span>
        {/* New text is a new input: answers given for the old text don't carry over. */}
        <textarea value={input.input} onChange={(e) => onChange({ ...input, id: newId("input"), input: e.target.value })} rows={1} />
      </label>
      <label>
        <span>Right answer, if there is one</span>
        <textarea value={input.expect} onChange={(e) => onChange({ ...input, expect: e.target.value })} rows={1} placeholder={shaped ? "As JSON, like the answer's shape" : ""} />
      </label>
      {written && <small className="kind">{input.kind}</small>}
      <button className="plain" onClick={onRemove} aria-label="Remove this input">
        Remove
      </button>
    </li>
  );
}

function FeatureForm({ own, onChange, onRemove, onProblem }: { own: OwnFeature; onChange: (next: OwnFeature) => void; onRemove?: () => void; onProblem: (e: unknown) => void }) {
  const [writing, setWriting] = useState(false);
  const { inCheck, heldBack } = split(own);
  const yours = own.inputs.filter((i) => i.by === "you"), written = own.inputs.filter((i) => i.by === "cloud");
  const shaped = own.shape.trim() !== "";
  const stops = problem(own);
  const setInput = (next: OwnInput, at: OwnInput) => onChange({ ...own, inputs: own.inputs.map((i) => (i === at ? next : i)) });
  const remove = (at: OwnInput) => onChange({ ...own, inputs: own.inputs.filter((i) => i !== at) });
  // A changed instruction or shape is a different feature: its old answers no longer belong to it.
  const reworded = (change: Partial<OwnFeature>) => onChange({ ...own, ...change, id: newId("own") });

  async function write() {
    setWriting(true);
    try {
      onChange({ ...own, inputs: [...own.inputs, ...(await writeInputs(own))] });
    } catch (e) {
      onProblem(e);
    }
    setWriting(false);
  }

  return (
    <details className="own-feature" open>
      <summary>
        <strong>{own.name.trim() || "A feature of your app"}</strong>
        <span>
          {inCheck.length} input{inCheck.length === 1 ? "" : "s"} in the check{heldBack.length > 0 && `, ${heldBack.length} kept back`}
        </span>
      </summary>
      <label>
        What the feature does
        <input type="text" value={own.name} onChange={(e) => onChange({ ...own, name: e.target.value })} placeholder="Sort an incoming email" />
      </label>
      <label>
        The instruction your app sends
        <textarea value={own.system} onChange={(e) => reworded({ system: e.target.value })} rows={4} />
      </label>
      <label>
        The answer's shape
        <textarea value={own.shape} onChange={(e) => reworded({ shape: e.target.value })} rows={2} placeholder='{"team": "billing", "urgent": false}' />
        <small>Leave it empty for plain text. Otherwise paste the JSON schema your app sends, or one example answer as JSON.</small>
      </label>

      <h3>A few inputs your users send</h3>
      <p className="quiet">
        With a right answer, code compares each answer to it: capitals, punctuation and spacing don't count. Without one, {CLOUD_MODEL} judges the
        answer against your instruction, and the report says so.
      </p>
      <p className="own-columns" aria-hidden="true">
        <span>Input</span>
        <span>Right answer, if there is one</span>
      </p>
      <ul>
        {yours.map((i) => (
          <InputRow key={own.inputs.indexOf(i)} input={i} shaped={shaped} onChange={(next) => setInput(next, i)} onRemove={() => remove(i)} />
        ))}
      </ul>
      <p className="actions">
        <button className="plain" onClick={() => onChange({ ...own, inputs: [...yours, blankInput(), ...written] })}>
          Add an input
        </button>
        <button onClick={write} disabled={writing || !!stops}>
          {writing ? "The cloud model is writing" : `Have the cloud model write ${WRITTEN} more`}
        </button>
      </p>

      {written.length > 0 && (
        <>
          <h3>Written by the cloud model from yours</h3>
          <p className="quiet">
            Hard ones included. Tick the ones a real user could send, and correct or clear any right answer that's wrong: the cloud model wrote those
            too. One ticked input in four is kept out of the check, to prove a prompt fix on inputs it wasn't written from.
          </p>
          <p className="own-columns" data-by="cloud" aria-hidden="true">
            <span>Input</span>
            <span>Right answer, if there is one</span>
          </p>
          <ul>
            {written.map((i) => (
              <InputRow key={own.inputs.indexOf(i)} input={i} shaped={shaped} onChange={(next) => setInput(next, i)} onRemove={() => remove(i)} />
            ))}
          </ul>
        </>
      )}

      {stops && <p className="wrong">{stops}</p>}
      {!stops && inCheck.length < ENOUGH_INPUTS && (
        <p className="quiet">
          A verdict needs {ENOUGH_INPUTS} inputs in the check; this feature has {inCheck.length}.
        </p>
      )}
      {onRemove && (
        <p className="actions">
          <button className="plain" onClick={onRemove}>
            Remove this feature
          </button>
        </p>
      )}
    </details>
  );
}

const chromeVersion = /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? "?";

function App() {
  const [saved, setSaved] = useState(load);
  const latest = useRef(saved);
  const [device, setDevice] = useState<DeviceState>();
  const [running, setRunning] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const stop = useRef(false);

  useEffect(() => {
    deviceState().then(setDevice);
  }, []);

  function keep(change: (now: Saved) => Saved) {
    const next = change(latest.current);
    const ids = new Set(next.features.map((f) => f.id));
    const mine = <T,>(all: Record<string, T>) => Object.fromEntries(Object.entries(all).filter(([id]) => ids.has(id)));
    latest.current = { features: next.features, answers: mine(next.answers), fixes: mine(next.fixes) };
    localStorage.setItem(KEY, JSON.stringify(latest.current));
    setSaved(latest.current);
  }

  const put = (id: string) => (cases: Cases) => keep((now) => ({ ...now, answers: { ...now.answers, [id]: merge(now.answers[id] ?? {}, cases) } }));
  const setFeature = (next: OwnFeature, at: number) => keep((now) => ({ ...now, features: now.features.map((f, i) => (i === at ? next : f)) }));

  function say(e: unknown) {
    if (e instanceof OutOfRequests) setNotice(`${outOfRequests(e)} What has run so far is kept in this browser.`);
    else setNotice(`The cloud model's answer couldn't be used: ${e instanceof Error ? e.message : String(e)}`);
  }

  async function run() {
    stop.current = false;
    setNotice(undefined);
    try {
      for (const own of latest.current.features) {
        if (problem(own) || stop.current) continue;
        setRunning(own.id);
        const feature = toFeature(own);
        const everyInput = { ...feature, cases: [...feature.cases, ...(feature.heldBack ?? [])] };
        const start = latest.current.answers[own.id] ?? {};
        // The device's runs are free and the cloud's are paced by the free tier, so they go side by side; the device finishes even if the cloud runs out.
        const [, cloud] = await Promise.allSettled([
          runDevice(everyInput, start, put(own.id), () => stop.current),
          runCloud(feature, start, put(own.id), () => stop.current),
        ]);
        if (cloud.status === "rejected") throw cloud.reason;
        if (!stop.current) put(own.id)(await gradeFeature(everyInput, latest.current.answers[own.id]));
      }
    } catch (e) {
      say(e);
    }
    setRunning(undefined);
  }

  const ready = saved.features.filter((own) => !problem(own));
  // Two features with one name still need a Remote Config parameter each.
  const features = ready.map(toFeature).map((f, at, all) => {
    const earlier = all.slice(0, at).filter((other) => other.key === f.key).length;
    return earlier ? { ...f, key: `${f.key}_${earlier + 1}` } : f;
  });
  const started = features.filter((f) => Object.keys(saved.answers[f.id] ?? {}).length > 0);
  const requests = ready.reduce((sum, own) => sum + cloudRequests(own), 0);
  const answered = (id: string) => Object.values(saved.answers[id] ?? {}).filter((r) => r.device.length === RUNS).length;
  const runningOwn = ready.find((own) => own.id === running);
  const judged = ready.flatMap((own) => [...split(own).inCheck, ...split(own).heldBack]);
  const wroteRight = judged.filter((i) => i.by === "cloud" && hasExpect(i)).length;

  return (
    <main className="check own">
      <header>
        <h1>
          <i />
          Device or Cloud
        </h1>
        <p>
          Check your own prompts · <a href="/">See the sample shop's check</a>
        </p>
        {device === "available" && <p className="quiet">Runs on this computer, Chrome {chromeVersion}</p>}
        {(device === "downloadable" || device === "downloading") && <p className="quiet">Chrome {chromeVersion}, without its built-in model yet</p>}
      </header>

      {device && (
        <DownloadPanel
          state={device}
          onState={setDevice}
          now="Your prompts can't be checked here without Chrome's built-in model."
          toGetIt="Chrome downloads it once: about 4 GB, 12 minutes on our laptop."
        />
      )}

      <section className="intro">
        <h2>Which of your app's AI features can run on your users' own devices?</h2>
        <p className="lede">
          Paste a feature: the instruction your app sends, the shape of the answer and a few inputs. Each input goes through Firebase AI Logic {RUNS}{" "}
          times to the model built into Chrome, on this computer, and once to {CLOUD_MODEL} in the cloud. You get the same verdicts as the sample shop.
        </p>
      </section>

      <p className="notice">
        What you paste is sent to Google's free Gemini tier, and Google may use what is sent to that tier to improve its products. Paste nothing
        private. What Chrome's model does stays on this computer, and your features are kept only in this browser.
      </p>

      <section className="own-features">
        {saved.features.map((own, at) => (
          <FeatureForm
            key={at}
            own={own}
            onChange={(next) => setFeature(next, at)}
            onRemove={saved.features.length > 1 ? () => keep((now) => ({ ...now, features: now.features.filter((_, i) => i !== at) })) : undefined}
            onProblem={say}
          />
        ))}
        <p className="actions">
          <button className="plain" onClick={() => keep((now) => ({ ...now, features: [...now.features, blankFeature()] }))} disabled={!!running}>
            Add another feature
          </button>
          {running ? (
            <button onClick={() => (stop.current = true)}>
              Stop · {runningOwn && toFeature(runningOwn).name}: {answered(running)} of {runningOwn ? split(runningOwn).inCheck.length + split(runningOwn).heldBack.length : 0}
            </button>
          ) : (
            <button onClick={run} disabled={device !== "available" || !ready.length}>
              Run the check
            </button>
          )}
        </p>
        {ready.length > 0 && (
          <p className="quiet">
            The cloud side uses about {requests} of the 500 free cloud requests this site shares each day, at most 15 a minute, so it takes a few
            minutes. Inputs already answered aren't sent again.
          </p>
        )}
      </section>

      {notice && <p className="notice">{notice}</p>}

      {started.length > 0 && (
        <>
          <Board
            features={started}
            cases={saved.answers}
            held={saved.answers}
            fixes={saved.fixes}
            canRun={device === "available" && !running}
            whyNot={whyNot(device)}
            onFix={(id, fix) => keep((now) => ({ ...now, fixes: { ...now.fixes, [id]: [...(now.fixes[id] ?? []).filter((f) => f.line !== fix.line), fix] } }))}
          />
          <footer>
            <p>
              {judged.filter(hasExpect).length} of your {judged.length} inputs have a right answer, and code compared every answer to it.
              {judged.some((i) => !hasExpect(i)) &&
                ` The other ${judged.filter((i) => !hasExpect(i)).length} have none, so ${CLOUD_MODEL} judged each answer against your instruction, its own answers included; a failure shown above says which way it was judged.`}
              {wroteRight > 0 &&
                ` ${wroteRight} of the right answers were written by ${CLOUD_MODEL} itself, which flatters its own score on them unless you corrected them.`}
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
