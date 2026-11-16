import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../base.css";
import { OutOfRequests, outOfRequests } from "../check/ask";
import { Board } from "../check/board";
import { RUNS, verdictFor, written, type Cases, type CheckRecord } from "../check/record";
import { gradeAgain, gradeFeature, runCloud, runDevice } from "../check/run";
import { CLOUD_MODEL, SECOND_GRADER } from "../firebase";
import { NOT_RUN, SAMPLES } from ".";
import recorded from "./recorded.json";

const RECORD = recorded as CheckRecord;
const FEATURES = SAMPLES.map((s) => s.feature);
const NOT_RUN_COUNT = NOT_RUN.reduce((n, group) => n + group.prompts.length, 0);

function App() {
  const [features, setFeatures] = useState<Record<string, Cases>>(RECORD.features);
  const [running, setRunning] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const put = (id: string) => (cases: Cases) => setFeatures((all) => ({ ...all, [id]: cases }));

  // Dev only: makes this record, or adds what it still lacks. Chrome's model comes first, because it is free; a run cut
  // short by the free tier's day keeps what it has and goes on from there the next time.
  async function recordEverything() {
    const all: Record<string, Cases> = { ...(JSON.parse(sessionStorage.getItem("partial") ?? "null") ?? RECORD).features };
    const save = () => sessionStorage.setItem("partial", JSON.stringify({ features: all }));
    setFeatures(all);
    try {
      for (const f of FEATURES) {
        setRunning(f.id);
        all[f.id] = await runDevice(f, all[f.id] ?? {}, put(f.id), () => false);
        save();
      }
      // With ?free in the address the run ends here, before anything that spends the day's cloud requests.
      if (new URLSearchParams(location.search).has("free")) return;
      for (const f of FEATURES) {
        setRunning(f.id);
        all[f.id] = await gradeFeature(f, await runCloud(f, all[f.id], put(f.id)));
        put(f.id)(all[f.id]);
        save();
      }
      // The second model judges the judged answers again, as far as it goes: its free day is smaller, and for days it
      // answered nothing at all. No verdict reads it, so the record is made with what it has.
      try {
        for (const f of FEATURES.filter((f) => f.graded)) {
          setRunning(f.id);
          all[f.id] = await gradeAgain(f, all[f.id], (cases) => { all[f.id] = cases; save(); });
        }
      } catch (e) {
        console.error("the second grader stopped:", String(e).slice(0, 200));
      }
    } catch (e) {
      if (!(e instanceof OutOfRequests)) throw e;
      setNotice(outOfRequests(e));
      return;
    } finally {
      setRunning(undefined);
    }
    const record: CheckRecord = {
      machine: import.meta.env.VITE_RECORD_MACHINE ?? "",
      chrome: /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? "?",
      date: new Date().toISOString().slice(0, 10),
      cloudModel: CLOUD_MODEL,
      secondGrader: SECOND_GRADER,
      features: all,
    };
    // The record takes the partial's place: the two together are more than a page may store.
    sessionStorage.removeItem("partial");
    sessionStorage.setItem("record", JSON.stringify(record));
  }

  const verdicts = FEATURES.map((f) => verdictFor(f, features[f.id]));
  const onDevice = verdicts.filter((v) => v.kind === "device").length;
  const done = running ? Object.values(features[running] ?? {}).filter((r) => r.device.length === RUNS).length : 0;
  const all = SAMPLES.length + NOT_RUN_COUNT;

  return (
    <main className="check sample samples">
      <header>
        <h1>
          <i />
          Device or Cloud
        </h1>
        <p>
          Firebase's own sample prompts · <a href="/">Back to the check</a>
        </p>
        <p className="quiet">
          Recorded on {RECORD.machine}, Chrome {RECORD.chrome}, {written(RECORD.date)}
        </p>
        {import.meta.env.DEV &&
          (running ? (
            <button disabled>
              Stop · {FEATURES.find((f) => f.id === running)!.name}: {done} of {FEATURES.find((f) => f.id === running)!.cases.length}
            </button>
          ) : (
            <button onClick={recordEverything}>Record everything</button>
          ))}
      </header>

      {notice && <p className="notice">{notice}</p>}

      <section className="intro">
        <h2>
          We checked the {SAMPLES.length} text prompts in Firebase's own sample apps. {onDevice} can run on the device as written.
        </h2>
        <p className="lede">
          Firebase's sample apps for AI Logic, the web, iOS and Android quickstarts as they stood on 15 November 2026, send {all} fixed prompts.{" "}
          {SAMPLES.length + 1} are text in and text out, and {SAMPLES.length} of those have their text in the repositories. Each of the{" "}
          {SAMPLES.length} went through the check as it is written, with {FEATURES[0].cases.length} inputs: the sample's own input where it has
          one, and the rest written by us. Every input went through Firebase AI Logic {RUNS} times to the model built into Chrome and once to{" "}
          {RECORD.cloudModel || CLOUD_MODEL} in the cloud. The other {NOT_RUN_COUNT} prompts are listed below, with why the check does not run
          them.
        </p>
      </section>

      <Board
        features={FEATURES}
        cases={features}
        recordedOn="our laptop"
        canRun={false}
        handsOver={false}
        said={(n) => `${n} of the ${SAMPLES.length} text prompts in Firebase's sample apps can run on the device as written.`}
      />

      <section className="sources">
        <h2>The {SAMPLES.length} prompts the check ran</h2>
        <ul>
          {SAMPLES.map(({ feature, from, link }) => (
            <li key={feature.id}>
              <b>{feature.name}</b>
              <span>
                <a href={link}>{from}</a> · {feature.graded ? "judged by the cloud model, after what code can check" : "checked by code"}
              </span>
            </li>
          ))}
        </ul>
        <h2>The {NOT_RUN_COUNT} it did not run</h2>
        {NOT_RUN.map((group) => (
          <div key={group.why}>
            <p>{group.why}</p>
            <ul>
              {group.prompts.map((p) => (
                <li key={p.name}>
                  <b>{p.name}</b>
                  <span>
                    <a href={p.link}>{p.from}</a>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <footer>
        <p>
          Code decides wherever a prompt's own rules can be checked by code: the genre, the function call's city, state and date, the number and
          shape of the characters, the invoice's parts, the SVG's rules, and the right answer inside a persona's reply. Where a prompt asks for
          something code can't check, a translation, a style, sound advice, the cloud model judges that one thing, its own answers included. The
          inputs marked as ours are ours: Firebase's samples give one input each, or none.{" "}
          <a href="/samples/results/">Every input and every answer of this record</a> is on one page, misses included.
        </p>
        <p>
          The cloud side here is {RECORD.cloudModel || CLOUD_MODEL} for every prompt, the model most of these samples name. The SVG sample itself
          names a larger cloud model.
        </p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
