import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnswerText } from "../answer";
import "../base.css";
import recorded from "../check/recorded.json";
import type { CheckRecord } from "../check/record";
import { readMarks, saveMark } from "../labels";
import { judgedInCheck, markKey, type Judged, type Mark } from "../results/judges";

const JUDGED = judgedInCheck(recorded as CheckRecord);

/** How many answers one person is asked for. They may go on past it. */
const ASKED = 20;

/** This browser's own id, so the page can count a person's marks without knowing who they are. */
function myId(): string {
  let id = localStorage.getItem("marker");
  if (!id) localStorage.setItem("marker", (id = crypto.randomUUID()));
  return id;
}

function App() {
  const [me] = useState(myId);
  const [marks, setMarks] = useState<Map<string, Mark>>();
  const [shown, setShown] = useState<Judged>();
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);

  /** Reads the marks again and draws the next answer nobody has marked. */
  async function next() {
    try {
      const all = await readMarks();
      const left = JUDGED.filter((j) => !all.has(markKey(j.feature.id, j.c.id, j.answer)));
      setMarks(all);
      setShown(left[Math.floor(Math.random() * left.length)]);
      setProblem(false);
    } catch {
      setProblem(true);
    }
  }
  useEffect(() => void next(), []);

  async function mark(good: boolean) {
    setBusy(true);
    // A refusal means someone else marked this answer a moment ago. Theirs stays, and the next read shows it.
    await saveMark(shown!, good, me).catch(() => {});
    await next();
    setBusy(false);
  }

  const mine = marks ? [...marks.values()].filter((m) => m.by === me).length : 0;
  const left = marks ? JUDGED.length - JUDGED.filter((j) => marks.has(markKey(j.feature.id, j.c.id, j.answer))).length : 0;
  return (
    <main className="label">
      <header>
        <h1>
          <i />
          Device or Cloud
        </h1>
        <p>Is this answer good enough?</p>
      </header>
      {problem && (
        <p className="notice">
          The page can't reach its server. Check your connection, then <button className="plain" onClick={next}>try again</button>.
        </p>
      )}
      {marks && !shown && <p className="lede">Every answer has a mark now. Thank you.</p>}
      {marks && shown && mine >= ASKED && !more && (
        <section className="thanks">
          <h2>That's your {ASKED}. Thank you.</h2>
          <p>
            {left} answers still have no mark. Each one you add makes the result firmer.
          </p>
          <button onClick={() => setMore(true)}>Mark some more</button>
        </section>
      )}
      {marks && shown && (mine < ASKED || more) && (
        <section className="task">
          <p className="quiet">{mine < ASKED ? `${mine + 1} of ${ASKED}` : `${mine + 1}, and ${left} still have no mark`}</p>
          <p className="quiet">The app was given</p>
          <pre>{shown.c.input}</pre>
          <p className="quiet">It answered</p>
          <div className="answered">
            <AnswerText text={shown.answer} />
          </div>
          <p className="judge">
            <b>Judge only this.</b> {shown.feature.graded}
          </p>
          <div className="actions">
            <button onClick={() => mark(true)} disabled={busy}>
              Good enough
            </button>
            <button onClick={() => mark(false)} disabled={busy}>
              Not good enough
            </button>
          </div>
          <details>
            <summary>What the app was told to do</summary>
            <p>{shown.feature.system}</p>
          </details>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
