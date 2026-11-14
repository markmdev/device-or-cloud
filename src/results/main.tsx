import { createRoot } from "react-dom/client";
import { AnswerText } from "../answer";
import "../base.css";
import recorded from "../check/recorded.json";
import { DEFAULT_ALLOWED, graded, judge, RUNS, VERDICT_NAME, type CaseRecord, type CheckRecord, type Run, type Tally } from "../check/record";
import type { Case, Feature } from "../features";
import { numbers, WHO, type FeatureNumbers } from "./numbers";

const RECORD = recorded as CheckRecord;

/** The right answer as the record holds it: one value, a set of fields, or the details an answer has to keep. */
function Expected({ c }: { c: Case }) {
  const e = c.expect;
  if (e === undefined) return <p className="quiet">No right answer on record.</p>;
  if (typeof e !== "object" || e === null) return <p className="answer">{String(e)}</p>;
  const { keep, example } = e as { keep?: string[][]; example?: string };
  if (!keep) return <AnswerText text={JSON.stringify(e)} />;
  return (
    <>
      <p className="answer">Has to keep: {keep.map((ways) => ways.join(" or ")).join("; ")}.</p>
      {example && <p className="quiet">One good answer: {example}</p>}
    </>
  );
}

function Answer({ feature, c, run, r, who, source }: { feature: Feature; c: Case; run?: Run; r?: CaseRecord; who: string; source: "on_device" | "in_cloud" }) {
  const check = judge(feature, c, run, r?.grades);
  if (!run) return null;
  const byCode = !graded(feature, c) || ("text" in run && !feature.check(run.text, c).ok);
  return (
    <div className="given" data-ok={check?.ok} data-source={source}>
      <p className="quiet">
        {who}
        {"seconds" in run && ` · ${run.seconds.toFixed(1)} s`}
      </p>
      {"error" in run ? <p className="answer">{run.error}</p> : <AnswerText text={run.text} />}
      <p className={check?.ok ? "right" : "wrong"}>
        {!check ? "Not judged." : check.ok ? "Right." : `Wrong. ${check.reason}`} <small>{"error" in run ? "" : byCode ? "Checked by code." : "Judged by the cloud model."}</small>
      </p>
    </div>
  );
}

/** One input with its right answer and every answer given for it. */
function Input({ feature, c, r, n }: { feature: Feature; c: Case; r?: CaseRecord; n: number }) {
  return (
    <article className="result" id={c.id}>
      <div className="asked">
        <p className="quiet">
          {n} · {c.kind}
        </p>
        <pre>{c.input}</pre>
        <p className="quiet">The right answer</p>
        <Expected c={c} />
      </div>
      {Array.from({ length: RUNS }, (_, i) => (
        <Answer key={i} feature={feature} c={c} run={r?.device[i]} r={r} who={`Chrome's model, run ${i + 1}`} source="on_device" />
      ))}
      <Answer feature={feature} c={c} run={r?.cloud} r={r} who="The cloud model" source="in_cloud" />
    </article>
  );
}

const Count = ({ right, of }: { right: number; of: number }) => (
  <td data-within={(of - right) * 100 <= DEFAULT_ALLOWED * of}>
    {right} of {of}
  </td>
);

const Counts = ({ t }: { t: Tally }) => (
  <>
    <Count right={t.runsRight} of={t.runs} />
    {t.cloud > 0 ? <Count right={t.cloudRight} of={t.cloud} /> : <td>not asked</td>}
  </>
);

function FeatureResults({ f }: { f: FeatureNumbers }) {
  const { feature, verdict: v } = f;
  const held = feature.heldBack ?? [];
  return (
    <section className="feature-results" id={feature.id}>
      <h2>{feature.name}</h2>
      <p>
        <b>{VERDICT_NAME[v.kind]}</b> Chrome's model was right on {v.runsRight} of {v.runs} runs, the cloud model on {v.cloudRight} of {v.inputs}.{" "}
        {feature.graded
          ? "This feature has no single right answer: code checks its rules and the details an answer has to keep, and the cloud model judges the rest."
          : "Code decides every answer."}
      </p>
      <p className="quiet">The instruction the app sends</p>
      <pre>{feature.system}</pre>
      <table>
        <thead>
          <tr>
            <th>Kind of input</th>
            <th>Inputs</th>
            <th>Chrome's model, runs right</th>
            <th>The cloud, inputs right</th>
          </tr>
        </thead>
        <tbody>
          {f.kinds.map((k) => (
            <tr key={k.kind}>
              <td>{k.kind}</td>
              <td>{k.inputs}</td>
              <Counts t={k.tally} />
            </tr>
          ))}
        </tbody>
      </table>
      {feature.cases.map((c, i) => (
        <Input key={c.id} feature={feature} c={c} r={RECORD.features[feature.id]?.[c.id]} n={i + 1} />
      ))}

      {f.held && (
        <>
          <h3>{held.length} inputs held back from the check</h3>
          <p>
            Used only to prove a one-line fix on inputs it wasn't written from. As the instruction stands, Chrome's model was right on{" "}
            {f.held.runsRight} of {f.held.runs} runs and the cloud model on {f.held.cloudRight} of {f.held.cloud}.
          </p>
          {held.map((c, i) => (
            <Input key={c.id} feature={feature} c={c} r={RECORD.held?.[feature.id]?.[c.id]} n={i + 1} />
          ))}
        </>
      )}

      {f.fixes.map((x) => (
        <details key={x.fix.line} className="fix-results">
          <summary>
            <b>With {WHO[x.fix.by]}: {x.moved ? "moves to the device." : "doesn't move."}</b> Chrome's model {x.own.runsRight} of {x.own.runs} on the
            check's inputs and {x.held.runsRight} of {x.held.runs} on those held back; the cloud {x.held.cloudRight} of {x.held.cloud} on those held back.
          </summary>
          <blockquote>{x.fix.line}</blockquote>
          {feature.cases.map((c, i) => (
            <Input key={c.id} feature={feature} c={c} r={x.fix.cases[c.id]} n={i + 1} />
          ))}
          {held.map((c, i) => (
            <Input key={c.id} feature={feature} c={c} r={x.fix.held[c.id]} n={i + 1} />
          ))}
        </details>
      ))}
    </section>
  );
}

function App() {
  const all = numbers(RECORD);
  const sum = (pick: (f: FeatureNumbers) => number) => all.reduce((n, f) => n + pick(f), 0);
  const date = new Date(RECORD.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <main className="check results">
      <header>
        <h1>
          <i />
          Device or Cloud
        </h1>
        <p>
          Every input and every answer · <a href="/">Back to the check</a>
        </p>
        <p className="quiet">
          Recorded on {RECORD.machine}, Chrome {RECORD.chrome}, {date}
        </p>
      </header>

      <section className="intro">
        <h2>The whole record behind the sample shop's check, misses included.</h2>
        <p className="lede">
          {sum((f) => f.verdict.inputs)} inputs for {all.length} features. Each went through Firebase AI Logic {RUNS} times to the model built into Chrome{" "}
          {RECORD.chrome} and once to {RECORD.cloudModel} in the cloud. Chrome's model was right on {sum((f) => f.verdict.runsRight)} of{" "}
          {sum((f) => f.verdict.runs)} runs, the cloud model on {sum((f) => f.verdict.cloudRight)} of {sum((f) => f.verdict.inputs)}. The verdicts are at
          the default bar, up to {DEFAULT_ALLOWED} wrong answers in 100; a count short of it is marked.
        </p>
      </section>

      <section className="summary">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Verdict</th>
              <th>Inputs</th>
              <th>Chrome's model, runs right</th>
              <th>The cloud, inputs right</th>
            </tr>
          </thead>
          <tbody>
            {all.map((f) => (
              <tr key={f.feature.id}>
                <td>
                  <a href={`#${f.feature.id}`}>{f.feature.name}</a>
                </td>
                <td data-verdict={f.verdict.kind}>{VERDICT_NAME[f.verdict.kind].replace(/\.$/, "")}</td>
                <td>{f.verdict.inputs}</td>
                <Count right={f.verdict.runsRight} of={f.verdict.runs} />
                <Count right={f.verdict.cloudRight} of={f.verdict.inputs} />
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          The same numbers print from the same record in the project's repository: <code>npm install</code>, then <code>npm run results</code>. The
          record is the file <code>src/check/recorded.json</code>, and the inputs and their right answers are in <code>src/features/</code>.
        </p>
      </section>

      {all.map((f) => (
        <FeatureResults key={f.feature.id} f={f} />
      ))}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
