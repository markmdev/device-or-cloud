import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { SOURCE_LABEL } from "../answer";
import type { Check, Feature } from "../features";
import { parse, plain } from "../features/types";
import { CLOUD_MODEL } from "../firebase";
import { appCode, CHROME, DEPLOY, IPHONE, swiftCode, TEMPLATE_FILE, templateText } from "./apply";
import { Fixes } from "./fixes";
import { APPLES, barInWords, CHROMES, DEFAULT_ALLOWED, dollarsPerRequest, graded, moves, onApple, RUNS, VERDICT_NAME, verdictFor, verdictLine, type Failure, type FixRecord, type Run, type Verdict } from "./record";
import type { Cases } from "./run";

/** One model's share of right answers, with the bar marked on it. */
function Meter({ who, right, of, unit, allowed, other }: { who: string; right: number; of: number; unit: string; allowed: number; other?: boolean }) {
  return (
    <span className="meter" data-within={(of - right) * 100 <= allowed * of} data-other={other}>
      <span>{who}</span>
      <i style={{ "--share": right / of, "--bar": 1 - allowed / 100 } as React.CSSProperties} />
      <span>
        <b>{right}</b> of {of}
        {unit}
      </span>
    </span>
  );
}

/** One feature on the board. `v` is its verdict on the platform the board shows; `chrome` and `apple` are each on-device model's own. */
function FeatureRow({ v, chrome, apple, mine, selected, onSelect, allowed, named }: { v: Verdict; chrome: Verdict; apple?: Verdict; mine: boolean; selected: boolean; onSelect: () => void; allowed: number; named?: boolean }) {
  const counted = v.kind === "device" || v.kind === "cloud" || v.kind === "fix";
  return (
    <li>
      <button className="feature" data-verdict={v.kind} aria-pressed={selected} onClick={onSelect} style={{ viewTransitionName: `feature-${v.feature.id}` }}>
        <strong>{v.feature.name}</strong>
        {named && <em>{VERDICT_NAME[v.kind].replace(/\.$/, "")}</em>}
        {counted ? (
          <>
            <Meter who={CHROMES} right={chrome.runsRight} of={chrome.runs} unit=" runs" allowed={allowed} other={v !== chrome} />
            {apple && <Meter who={APPLES} right={apple.runsRight} of={apple.runs} unit=" runs" allowed={allowed} other={v !== apple} />}
            <Meter who="The cloud" right={v.cloudRight} of={v.inputs} unit="" allowed={allowed} />
            {v.kind === "cloud" && v.pattern && <small>Its misses: {v.pattern}.</small>}
          </>
        ) : (
          <span>{verdictLine(v, v === apple ? APPLES : CHROMES)}</span>
        )}
        {mine && <small>Run on this computer just now</small>}
      </button>
    </li>
  );
}

/** A tick or a cross beside an answer. */
const Mark = ({ ok }: { ok?: boolean }) => (
  <svg className="mark" viewBox="0 0 30 30" aria-label={ok ? "Right" : "Wrong"}>
    <circle cx="15" cy="15" r="15" />
    <path d={ok ? "M8.5 15.5l4.5 4.5 8.5-10" : "M10 10l10 10M20 10L10 20"} />
  </svg>
);

const textOf = (run?: Run) => (run && "text" in run ? run.text : undefined);

/** The fields in which two answers differ: what a reader should look at first. */
function differing(a?: string, b?: string): string[] {
  const one = a ? parse(a) : null, other = b ? parse(b) : null;
  if (!one || !other) return [];
  return Object.keys(one).filter((key) => plain(one[key]) !== plain(other[key]));
}

/** What an answer shows large: the first field that tells the two answers apart, or the whole text. */
function headline(text: string | undefined, telling: string[]): { key?: string; value: string } | undefined {
  if (text === undefined) return undefined;
  const object = parse(text);
  if (!object) return { value: text };
  const key = telling[0] ?? Object.keys(object)[0];
  return key === undefined ? undefined : { key, value: String(object[key]) || "(empty)" };
}

function RunAnswer({ run, check, telling, size, children }: { run?: Run; check?: Check; telling: string[]; size: string; children?: ReactNode }) {
  if (!run) return <p className="quiet">No answer yet.</p>;
  const object = "text" in run ? parse(run.text) : null;
  const head = headline(textOf(run), telling);
  return (
    <div className="said" data-ok={check?.ok} data-size={size}>
      {"error" in run ? (
        <p className="answer">{run.error}</p>
      ) : (
        <>
          <p className="telling">
            {head?.key && <span>{head.key}</span>}
            <b>{head?.value}</b>
            {check && <Mark ok={check.ok} />}
          </p>
          {object && Object.keys(object).length > 1 && (
            <dl className="answer">
              {Object.entries(object).map(([key, value]) => (
                <div key={key} data-telling={telling.includes(key)}>
                  <dt>{key}</dt>
                  <dd>{String(value) || "(empty)"}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
      {children}
    </div>
  );
}

function Proof({ v, cases, who }: { v: Verdict; cases: Cases; who: string }) {
  const [at, setAt] = useState(0);
  useEffect(() => setAt(0), [v.feature.id]);
  if (v.kind === "pending") return <section className="proof"><p className="quiet">{v.feature.name}: waiting for answers.</p></section>;
  if (!v.failures.length) {
    return (
      <section className="proof">
        <p>
          <strong>{v.feature.name}.</strong> {who} and the cloud model were both right on all {v.inputs} inputs, on every run.
        </p>
      </section>
    );
  }
  // The plainest failures come first: only the on-device model wrong, and on every run.
  const sameOnAllRuns = (x: Failure) => new Set(cases[x.c.id].device.map((d) => ("text" in d ? d.text.replace(/\s+/g, "") : d.error))).size === 1;
  const plainness = (x: Failure) => (x.side === "device" ? 0 : 4) + (x.device.every((d) => !d.ok) ? 0 : 2) + (sameOnAllRuns(x) ? 0 : 1);
  const failures = [...v.failures].sort((a, b) => plainness(a) - plainness(b));
  const f: Failure = failures[Math.min(at, failures.length - 1)];
  const r = cases[f.c.id];
  const worst = Math.max(0, f.device.findIndex((d) => !d.ok));
  const run = r.device[worst];
  const wrongRuns = f.device.filter((d) => !d.ok).length;
  const sameText = new Set(r.device.map((d) => ("text" in d ? d.text : d.error))).size === 1;
  const decidedByCode = !graded(v.feature, f.c) || !v.feature.check("text" in run ? run.text : "", f.c).ok;
  const telling = differing(textOf(run), textOf(r.cloud));
  const longest = Math.max(...[run, r.cloud].map((x) => headline(textOf(x), telling)?.value.length ?? 0));
  const size = longest <= 16 ? "large" : longest <= 40 ? "medium" : "small";
  const deviceCheck = f.device[worst];
  return (
    <section className="proof">
      <div className="side device">
        <p className="badge" data-source="on_device">
          {who === APPLES ? SOURCE_LABEL.on_iphone : SOURCE_LABEL.on_device}
          {"seconds" in run && ` · ${run.seconds.toFixed(1)} s`}
        </p>
        <p className="who">{who} answered</p>
        <RunAnswer run={run} check={deviceCheck} telling={telling} size={size}>
          <p className="quiet">
            {wrongRuns === 0 ? `Right on all ${RUNS} runs.` : sameText ? `The same answer on all ${RUNS} runs.` : `Wrong on ${wrongRuns} of ${RUNS} runs.`}
          </p>
        </RunAnswer>
      </div>
      <div className="input">
        <p className="quiet">
          {v.feature.name} · input {v.feature.cases.indexOf(f.c) + 1} of {v.inputs}
          <span className="pager">
            <button onClick={() => setAt((at + failures.length - 1) % failures.length)} aria-label="Previous">‹</button>
            {Math.min(at, failures.length - 1) + 1} of {failures.length}
            <button onClick={() => setAt((at + 1) % failures.length)} aria-label="Next">›</button>
          </span>
        </p>
        <pre>{f.c.input}</pre>
        <p className="why">
          {!deviceCheck.ok ? deviceCheck.reason : f.cloud && !f.cloud.ok ? f.cloud.reason : ""}
          <small>
            {f.side === "cloud" ? "Only the cloud model got this one wrong." : f.side === "both" ? "Both models got this one wrong." : `Only ${who} got this one wrong.`}{" "}
            {decidedByCode ? "Checked by code." : "Judged by the cloud model."}
          </small>
        </p>
      </div>
      <div className="side cloud">
        <p className="badge" data-source="in_cloud">{SOURCE_LABEL.in_cloud}</p>
        <p className="who">The cloud model answered</p>
        <RunAnswer run={r.cloud} check={f.cloud} telling={telling} size={size}>
          {f.cloud && !f.cloud.ok && f.side === "both" && <p className="quiet">{f.cloud.reason}</p>}
        </RunAnswer>
      </div>
    </section>
  );
}

function BottomLine({ verdicts, allowed, afterFixes, devices }: { verdicts: Verdict[]; allowed: number; afterFixes: number; devices: string }) {
  const [requests, setRequests] = useState(100_000);
  const [share, setShare] = useState(30);
  const onDevice = verdicts.filter((v) => v.kind === "device");
  const seconds = onDevice.map((v) => v.deviceSeconds ?? 0).sort((a, b) => a - b);
  const fastest = seconds[0]?.toFixed(1), slowest = seconds.at(-1)?.toFixed(1);
  const saved = onDevice.reduce((sum, v) => sum + dollarsPerRequest(v), 0) * requests * (share / 100);
  return (
    <section className="bottom">
      <h2>
        {barInWords(allowed)},{" "}
        {verdicts.length === 1
          ? onDevice.length
            ? `this feature can run on your users' own ${devices}.`
            : afterFixes
              ? `this feature stays in the cloud today, and can run on your users' own ${devices} after a one-line fix.`
              : `this feature can't run on your users' own ${devices} yet.`
          : `${onDevice.length} of ${verdicts.length} features can run on your users' own ${devices}${
              afterFixes > onDevice.length ? ` today, and ${afterFixes} of ${verdicts.length} after one-line fixes.` : "."
            }`}
      </h2>
      {onDevice.length > 0 && (
        <p className="gains">
          Those requests <b>never leave the device</b>, <b>work offline</b> and <b>answer in {fastest === slowest ? fastest : `${fastest} to ${slowest}`} s</b>.
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

function Copy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [text]);
  return (
    <button className="plain" onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** The verdicts handed over as Remote Config: the template, the app code that reads it, and the command that deploys it. */
function Apply({ verdicts, apple, children }: { verdicts: Verdict[]; apple?: Verdict[]; children?: ReactNode }) {
  const text = templateText(verdicts, apple), code = appCode(verdicts), swift = apple && swiftCode(verdicts, CLOUD_MODEL);
  const moved = verdicts.filter((v) => v.kind === "device").length;
  return (
    <section className="apply">
      <h2>Apply it</h2>
      <p className="lede">
        The verdicts at this bar as a Firebase Remote Config template: one parameter for each feature, holding its inference mode. Every feature
        stays in the cloud by default.{" "}
        {apple
          ? `A feature that can run on the device gets prefer_on_device under a condition for the platform whose own model passed: "${CHROME}" for Chrome's model, "${IPHONE}" for Apple's. A verdict holds on its own platform and nowhere else.`
          : moved > 0
            ? `${moved === 1 ? "The one" : `The ${moved}`} that can run on the device ${moved === 1 ? "gets" : "get"} prefer_on_device under a condition, "${CHROME}": this check ran Chrome's model, so its verdicts hold there and nowhere else.`
            : "At this bar none is moved to the device."}{" "}
        Nothing on this page writes to your Firebase project. You deploy the template yourself, and after that you move a feature back from the
        Firebase console, with no release.
      </p>
      {children}
      <article>
        <h3>1. Save this as {TEMPLATE_FILE}</h3>
        <pre>{text}</pre>
        <p className="actions">
          <Copy text={text} />
          <a className="button plain" download={TEMPLATE_FILE} href={`data:application/json;charset=utf-8,${encodeURIComponent(text)}`}>
            Download
          </a>
        </p>
      </article>
      <article>
        <h3>2. Read each feature's mode in your app</h3>
        {swift && <p className="quiet">On the web</p>}
        <pre>{code}</pre>
        <p className="actions">
          <Copy text={code} />
        </p>
        {swift && (
          <>
            <p className="quiet">In the iPhone app</p>
            <pre>{swift}</pre>
            <p className="actions">
              <Copy text={swift} />
            </p>
          </>
        )}
      </article>
      <article>
        <h3>3. Deploy it</h3>
        <p>Name the template in your firebase.json, then deploy only Remote Config:</p>
        <pre>{`"remoteconfig": { "template": "${TEMPLATE_FILE}" }\n\n${DEPLOY}`}</pre>
        <p className="quiet">
          This replaces your project's whole Remote Config template. If the project already has parameters, add these to its own template instead.
        </p>
      </article>
    </section>
  );
}

/**
 * The verdicts for a list of features: the bar, the two sides, the proof for one feature, its one-line fixes and the bottom line.
 */
export function Board({ features, cases, mine = [], held, fixes, opensOn, canRun, onFix, children }: {
  features: Feature[];
  cases: Record<string, Cases>;
  /** Features whose device answers were made on this computer just now. */
  mine?: string[];
  /** The held-back inputs' answers as each instruction stands, by feature. */
  held?: Record<string, Cases>;
  fixes?: Record<string, FixRecord[]>;
  /** The feature whose proof shows first. */
  opensOn?: string;
  canRun: boolean;
  /** Given where a line tried on the page is also run in the cloud and kept: a developer's own feature. */
  onFix?: (featureId: string, fix: FixRecord) => void;
  /** A note under "Apply it" about where this template is in use. */
  children?: ReactNode;
}) {
  const [selected, setSelected] = useState(opensOn);
  // The slider's own position is kept apart from the bar the verdicts use: the verdicts follow a moment later when
  // a feature crosses the line, and a slider that waited for them would snap back under a held key.
  const [bar, setBarNow] = useState(DEFAULT_ALLOWED);
  const [allowed, setAllowed] = useState(DEFAULT_ALLOWED);
  const latestBar = useRef(DEFAULT_ALLOWED);

  // Where the record has Apple's runs too, the board is about one platform at a time: Chrome on the web, or the iPhone app.
  const hasApple = features.some((f) => Object.values(cases[f.id] ?? {}).some((r) => r.apple));
  const [iphone, setIphone] = useState(false);
  const who = iphone ? APPLES : CHROMES;
  const seen = (id: string) => (iphone ? onApple(cases[id]) : cases[id]);
  const chrome = features.map((f) => verdictFor(f, cases[f.id], allowed));
  const apple = hasApple ? features.map((f) => verdictFor(f, onApple(cases[f.id]), allowed)) : undefined;
  const verdicts = iphone ? apple! : chrome;
  const onDevice = verdicts.filter((v) => v.kind === "device"), inCloud = verdicts.filter((v) => v.kind === "cloud");
  const neither = verdicts.filter((v) => v.kind !== "device" && v.kind !== "cloud");

  // A feature that changes sides is seen crossing the line.
  function setBar(next: number) {
    setBarNow(next);
    latestBar.current = next;
    const sides = (at: number) => features.map((f) => verdictFor(f, seen(f.id), at).kind).join();
    if (!document.startViewTransition || sides(next) === sides(allowed)) return setAllowed(next);
    // A newer move of the slider skips this transition; its update still runs, so it takes the newest position.
    document.startViewTransition(() => flushSync(() => setAllowed(latestBar.current))).ready.catch(() => {});
  }
  const shown = verdicts.find((v) => v.feature.id === selected) ?? verdicts.find((v) => v.kind === "cloud") ?? verdicts.find((v) => v.failures.length) ?? verdicts[0];
  const row = (v: Verdict, named?: boolean) => {
    const i = verdicts.indexOf(v);
    return (
      <FeatureRow key={v.feature.id} v={v} chrome={chrome[i]} apple={apple?.[i]} allowed={allowed} named={named} mine={!iphone && mine.includes(v.feature.id)} selected={shown === v} onSelect={() => setSelected(v.feature.id)} />
    );
  };

  return (
    <>
      <div className="board" data-platform={iphone ? "iphone" : "chrome"}>
        <label className="bar">
          Wrong answers allowed in 100
          <input type="range" min={0} max={30} value={bar} onChange={(e) => setBar(Number(e.target.value))} />
          <output>{bar}</output>
        </label>
        {hasApple && (
          <div className="platforms" role="group" aria-label="Platform">
            <button aria-pressed={!iphone} onClick={() => setIphone(false)}>
              {CHROME}
            </button>
            <button aria-pressed={iphone} onClick={() => setIphone(true)}>
              {IPHONE}
            </button>
          </div>
        )}

        <div className="sides">
          <section className="side device">
            <h2>
              <b>{onDevice.length}</b> <span>run on the device</span>
            </h2>
            <ul>{onDevice.map((v) => row(v))}</ul>
            {onDevice.length === 0 && <p className="none">Nothing yet. At this bar, {who} is wrong too often on every feature.</p>}
          </section>
          <section className="side cloud">
            <h2>
              <b>{inCloud.length}</b> <span>stay in the cloud</span>
            </h2>
            <ul>{inCloud.map((v) => row(v))}</ul>
            {inCloud.length === 0 && <p className="none">Nothing has to stay here at this bar.</p>}
          </section>
        </div>

        {neither.length > 0 && (
          <section className="neither">
            <h2>
              <b>{neither.length}</b> <span>on neither side yet</span>
            </h2>
            <ul>{neither.map((v) => row(v, true))}</ul>
          </section>
        )}

        <Proof v={shown} cases={seen(shown.feature.id) ?? {}} who={who} />
        {/* The one-line fixes were tried on Chrome's model only. */}
        {!iphone && shown.kind === "cloud" && shown.feature.heldBack?.length && held?.[shown.feature.id] && (
          <Fixes
            feature={shown.feature}
            base={cases[shown.feature.id]}
            heldBase={held[shown.feature.id]}
            fixes={fixes?.[shown.feature.id] ?? []}
            allowed={allowed}
            canRun={canRun}
            onFix={onFix && ((fix) => onFix(shown.feature.id, fix))}
          />
        )}
      </div>
      <BottomLine
        verdicts={verdicts}
        allowed={allowed}
        afterFixes={verdicts.filter((v) => v.kind === "device" || (!iphone && v.kind === "cloud" && fixes?.[v.feature.id]?.some((fix) => moves(v.feature, fix, allowed)))).length}
        devices={iphone ? "iPhones" : "devices"}
      />
      {chrome.every((v) => v.kind !== "pending") && (
        <Apply verdicts={chrome} apple={apple}>
          {children}
        </Apply>
      )}
    </>
  );
}
