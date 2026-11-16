import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { isLong, LongText, SOURCE_LABEL, Value } from "../answer";
import type { Check, Feature } from "../features";
import { parse, shown } from "../features/types";
import { CLOUD_MODEL } from "../firebase";
import { appCode, CHROME, DEPLOY, fixesFor, IPHONE, parameterFor, placedOn, runsOnDevice, swiftCode, TEMPLATE_FILE, templateText, type Placed } from "./apply";
import { Fixes } from "./fixes";
import { APPLES, barInWords, CHROMES, costLine, countLine, DEFAULT_ALLOWED, differing, graded, NEITHER_ADVICE, onApple, RUNS, UNSURE, unsureLine, VERDICT_NAME, verdictFor, verdictLine, type Failure, type FixRecord, type Range, type Run, type Verdict } from "./record";
import type { Cases } from "./run";

const MAX_ALLOWED = 30;

/** One model's count of inputs it got right, with the bar marked on it and the range that count allows. */
function Meter({ who, right, of, runs, range, allowed, other, unsure }: { who: string; right: number; of: number; runs?: [right: number, of: number]; range: Range; allowed: number; other?: boolean; unsure?: boolean }) {
  // The bar and the side go by the share of answers that were right, which is the share of inputs unless answers vary between runs.
  const share = runs ? runs[0] / runs[1] : right / of;
  return (
    <span className="meter" data-within={(1 - share) * 100 <= allowed} data-other={other} data-unsure={unsure}>
      <span>{who}</span>
      <i style={{ "--share": share, "--bar": 1 - allowed / 100, "--low": 1 - range.high / 100, "--high": 1 - range.low / 100 } as React.CSSProperties}>
        <s />
      </i>
      <span>
        <b>{right}</b> of {of}
        {runs && runs[0] !== right * RUNS && (
          <small className="runs">
            {runs[0]} of {runs[1]} runs
          </small>
        )}
      </span>
    </span>
  );
}

const deviceMeter = (who: string, v: Verdict, allowed: number, other: boolean) => (
  <Meter who={who} right={v.inputsRight} of={v.inputs} runs={[v.runsRight, v.runs]} range={v.range} allowed={allowed} other={other} unsure={!!v.unsure} />
);

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
            {deviceMeter(CHROMES, chrome, allowed, v !== chrome)}
            {apple && deviceMeter(APPLES, apple, allowed, v !== apple)}
            <Meter who="The cloud" right={v.cloudRight} of={v.inputs} range={v.cloudRange} allowed={allowed} />
            <span className="range">
              {Math.round(v.range.low)} to {Math.round(v.range.high)} wrong in 100
            </span>
            {v.unsure && <span className="unsure">{UNSURE}</span>}
            {v.kind === "device" && <span className="cost">{costLine(v)}</span>}
            {v.kind === "cloud" && v.pattern && <small>Its misses: {v.pattern}.</small>}
            {v.kind === "fix" && <small>{NEITHER_ADVICE}</small>}
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

/** What an answer shows large: the first field that tells the two answers apart, or the whole text. `nested` is that field when it holds fields of its own. */
function headline(text: string | undefined, telling: string[]): { key?: string; value: string; nested?: object } | undefined {
  if (text === undefined) return undefined;
  const object = parse(text);
  if (!object) return { value: text };
  const key = telling[0] ?? Object.keys(object)[0];
  if (key === undefined) return undefined;
  const field = object[key];
  return { key, value: shown(field), nested: typeof field === "object" && field !== null ? field : undefined };
}

/** An answer too long to show large: a letter, a page of code. It has a box of its own, in the type a model's words are set in. */
const long = (head?: { value: string; nested?: object }) => Boolean(head && !head.nested && isLong(head.value));

function RunAnswer({ run, check, telling, size, children }: { run?: Run; check?: Check; telling: string[]; size: string; children?: ReactNode }) {
  if (!run) return <p className="quiet">No answer yet.</p>;
  const object = "text" in run ? parse(run.text) : null;
  const head = headline(textOf(run), telling);
  // The mark stays on the line of the answer's last word.
  const lastWord = (head?.value.lastIndexOf(" ") ?? -1) + 1;
  return (
    <div className="said" data-ok={check?.ok} data-size={size}>
      {"error" in run ? (
        <p className="answer">{run.error}</p>
      ) : long(head) ? (
        <LongText text={head!.value}>{check && <Mark ok={check.ok} />}</LongText>
      ) : (
        <>
          <p className="telling" data-nested={Boolean(head?.nested)}>
            {head?.key && <span>{head.key}</span>}
            {head?.nested ? (
              <b>
                <Value value={head.nested} end={check && <Mark ok={check.ok} />} />
              </b>
            ) : (
              <b>
                {head?.value.slice(0, lastWord)}
                <span className="together">
                  {head?.value.slice(lastWord)}
                  {check && <Mark ok={check.ok} />}
                </span>
              </b>
            )}
          </p>
          {object && Object.keys(object).length > 1 && (
            <dl className="answer">
              {Object.entries(object).map(([key, value]) => (
                <div key={key} data-telling={telling.includes(key)}>
                  <dt>{key}</dt>
                  <dd>
                    <Value value={value} />
                  </dd>
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

function Proof({ v, cases, who, recordedOn }: { v: Verdict; cases: Cases; who: string; recordedOn?: string }) {
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
  // Both answers are set at one size, the one the longer of them needs. A long answer has a box of its own and doesn't count.
  const heads = [run, r.cloud].map((x) => headline(textOf(x), telling)).filter((h) => h && !long(h));
  const longest = Math.max(0, ...heads.map((h) => h!.value.length));
  const size = heads.some((h) => h!.nested) || longest > 40 ? "small" : longest <= 16 ? "large" : "medium";
  const deviceCheck = f.device[worst];
  return (
    <section className="proof">
      <div className="side device">
        <p className="badge" data-source="on_device">
          {recordedOn ? `${who}, ${recordedOn}` : SOURCE_LABEL.on_device}
          {"seconds" in run && ` · ${run.seconds.toFixed(1)} s`}
        </p>
        <p className="who">{who} answered</p>
        <RunAnswer run={run} check={deviceCheck} telling={telling} size={size}>
          <p className="quiet">
            {wrongRuns === 0 ? `${v.feature.rules?.pass ?? "Right"} on all ${RUNS} runs.` : sameText ? `The same answer on all ${RUNS} runs.` : `Wrong on ${wrongRuns} of ${RUNS} runs.`}
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

/** Beside a side's count: how many of its features more inputs could still move. */
function Unsure({ of }: { of: Verdict[] }) {
  const n = of.filter((v) => v.unsure).length;
  if (!n) return null;
  return (
    <small>
      <span className="unsure">{UNSURE}</span> for {n === of.length ? (n === 1 ? "it" : n === 2 ? "both" : `all ${n}`) : `${n} of the ${of.length}`}: the range crosses the bar
    </small>
  );
}

const NEXT = ["a first", "a second", "a third", "a fourth", "a fifth", "a sixth", "a seventh", "an eighth"];

/** `afterFixes` counts the features on the device once each has its line or setting; `bySetting`, that a setting alone does it. */
function BottomLine({ verdicts, allowed, afterFixes, bySetting, shop, iphone, said }: { verdicts: Verdict[]; allowed: number; afterFixes: number; bySetting: boolean; shop: boolean; iphone: boolean; said?: (onDevice: Verdict[]) => string }) {
  const device = verdicts.filter((v) => v.kind === "device"), onDevice = device.length, more = afterFixes - onDevice;
  const change = bySetting ? "with the model's randomness switched off" : "after one added line in its prompt";
  const whose = shop ? "its" : "your", devices = iphone ? "iPhones" : "devices";
  return (
    <section className="bottom">
      <h2>
        {barInWords(allowed)},{" "}
        {said
          ? said(device)
          : verdicts.length === 1
          ? onDevice
            ? `this feature can run on your users' own ${devices}.`
            : more
              ? `this feature stays in the cloud today, and can run on your users' own ${devices} ${change}.`
              : `this feature can't run on your users' own ${devices} yet.`
          : `${onDevice} of ${shop ? "the shop's" : "your"} ${verdicts.length} AI features can run on ${whose} users' own ${devices}${
              more === 1
                ? ` today, and ${NEXT[onDevice] ?? "one more"} ${change}.`
                : more > 1
                  ? ` today, and ${more} more after one added line in each one's prompt.`
                  : "."
            }`}
      </h2>
      {onDevice > 0 && (
        <p className="gains">
          On {iphone ? "an iPhone that has Apple's model" : "a computer that has Chrome's model"}, those requests <b>stay on it</b> and{" "}
          <b>work offline</b>. Everywhere else they go to the cloud, as before.
        </p>
      )}
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
function Apply({ chrome, apple, children }: { chrome: Placed[]; apple?: Placed[]; children?: ReactNode }) {
  const verdicts = chrome.map((p) => p.verdict);
  const text = templateText(chrome, apple), code = appCode(verdicts, CLOUD_MODEL), swift = apple && swiftCode(verdicts, CLOUD_MODEL);
  const moved = chrome.filter(runsOnDevice).length;
  return (
    <section className="apply">
      <h2>Apply it</h2>
      <p className="lede">
        The check at this bar as a Firebase Remote Config template: one parameter for each feature, holding its inference mode. Every feature
        stays in the cloud by default.{" "}
        {apple
          ? `A feature that can run on the device gets prefer_on_device under a condition for the platform whose own model passed: "${CHROME}" for Chrome's model, "${IPHONE}" for Apple's. A verdict holds on its own platform and nowhere else.`
          : moved > 0
            ? `${moved === 1 ? "The one" : `The ${moved}`} that can run on the device ${moved === 1 ? "gets" : "get"} prefer_on_device under a condition, "${CHROME}": this check ran Chrome's model, so its verdicts hold there and nowhere else.`
            : "At this bar none is moved to the device."}{" "}
        Where a feature gets there only with one more line in its prompt, or with the model's randomness off, the line or the setting is in the
        template beside the mode, and the app reads both. Nothing on this page writes to your Firebase project. You deploy the template yourself,
        and after that you move a feature back from the Firebase console, with no release.
      </p>
      {children}
      <ul className="modes">
        {chrome.map((p, i) => {
          const v = p.verdict, a = apple?.[i];
          const how = (x: Placed) => (x.fix ? (x.fix.steady ? " with its randomness off" : " with one added line") : "");
          const where = [runsOnDevice(p) && `${CHROME}${how(p)}`, a && runsOnDevice(a) && `${IPHONE}${how(a)}`].filter(Boolean);
          return (
            <li key={v.feature.id} data-verdict={runsOnDevice(p) ? "device" : v.kind}>
              <b>{v.feature.name}</b>
              <code>{parameterFor(v.feature)}</code>
              <span>
                {where.length ? `prefer_on_device in ${where.join(" and in ")}, only_in_cloud everywhere else` : "only_in_cloud"}
                {(p.unsure || a?.unsure) && <span className="unsure">{UNSURE}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <details>
        <summary>The template, the app code and the deploy command</summary>
        <div className="files">
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
            <p>
              Chrome's model reads the instruction and the answer's shape only from <code>onDeviceParams</code>, so both are set twice.
            </p>
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
        </div>
      </details>
    </section>
  );
}

/**
 * The verdicts for a list of features: the bar, the two sides, the proof for one feature, its one-line fixes and the bottom line.
 */
export function Board({ features, cases, mine = [], recordedOn, held, fixes, opensOn, canRun, onFix, onPlatform, below, belowOnIphone, said, handsOver = true, children }: {
  features: Feature[];
  cases: Record<string, Cases>;
  /** Features whose device answers were made on this computer just now. */
  mine?: string[];
  /** Where the other answers were recorded, for the shop's check: "our laptop". Without it, every answer was made on this computer. */
  recordedOn?: string;
  /** The held-back inputs' answers as each instruction stands, by feature. */
  held?: Record<string, Cases>;
  fixes?: Record<string, FixRecord[]>;
  /** The feature whose proof shows first. */
  opensOn?: string;
  canRun: boolean;
  /** Given where a line tried on the page is also run in the cloud and kept: a developer's own feature. */
  onFix?: (featureId: string, fix: FixRecord) => void;
  /** Shown right under the board, above the bottom line. */
  below?: ReactNode;
  /** Told when the reader switches between Chrome on the web and the iPhone app. */
  onPlatform?: (iphone: boolean) => void;
  /** The same place on the iPhone view. */
  belowOnIphone?: ReactNode;
  /** The bottom line's count in the page's own words, where the features aren't an app's own. */
  said?: (onDevice: Verdict[]) => string;
  /** False where the page hands over no template: nothing follows the bottom line. */
  handsOver?: boolean;
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
  const [iphone, setIphoneHere] = useState(false);
  const setIphone = (to: boolean) => {
    setIphoneHere(to);
    onPlatform?.(to);
  };
  const who = iphone ? APPLES : CHROMES;
  const seen = (id: string) => (iphone ? onApple(cases[id]) : cases[id]);
  /** The lines and settings tried on the platform the board shows. */
  const chrome = features.map((f) => verdictFor(f, cases[f.id], allowed));
  const apple = hasApple ? features.map((f) => verdictFor(f, onApple(cases[f.id]), allowed)) : undefined;
  const verdicts = iphone ? apple! : chrome;
  const chromePlaced = placedOn(chrome, fixes, false, allowed), applePlaced = apple && placedOn(apple, fixes, true, allowed);
  const placed = iphone ? applePlaced! : chromePlaced;
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
  const proof = useRef<HTMLDivElement>(null);
  function select(id: string) {
    setSelected(id);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => proof.current?.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" }));
  }
  let firstOver: { at: number; name: string } | undefined;
  for (let at = allowed + 1; at <= MAX_ALLOWED && !firstOver && onDevice.length === 0; at++) {
    const over = features.find((f) => verdictFor(f, seen(f.id), at).kind === "device");
    if (over) firstOver = { at, name: over.name };
  }
  const row = (v: Verdict, named?: boolean) => {
    const i = verdicts.indexOf(v);
    return (
      <FeatureRow key={v.feature.id} v={v} chrome={chrome[i]} apple={apple?.[i]} allowed={allowed} named={named} mine={!iphone && mine.includes(v.feature.id)} selected={shown === v} onSelect={() => select(v.feature.id)} />
    );
  };

  return (
    <>
      <div className="board" data-platform={iphone ? "iphone" : "chrome"}>
        <label className="bar">
          Wrong answers allowed in 100
          <input type="range" min={0} max={MAX_ALLOWED} value={bar} onChange={(e) => setBar(Number(e.target.value))} />
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
              <Unsure of={onDevice} />
            </h2>
            <ul>{onDevice.map((v) => row(v))}</ul>
            {onDevice.length === 0 && (
              <p className="none">
                Nothing yet. At this bar, {who} is wrong too often on every feature.
                {firstOver && ` The first to cross is ${firstOver.name}, at ${firstOver.at}.`}
              </p>
            )}
          </section>
          <section className="side cloud">
            <h2>
              <b>{inCloud.length}</b> <span>stay in the cloud</span>
              <Unsure of={inCloud} />
            </h2>
            <ul>{inCloud.map((v) => row(v))}</ul>
            {inCloud.length === 0 && <p className="none">Nothing has to stay here at this bar.</p>}
          </section>
        </div>

        {neither.length > 0 && (
          <a className="more" href="#neither">
            <b>{neither.length}</b> on neither side yet
          </a>
        )}

        <div className="shown" ref={proof}>
          <Proof
            v={shown}
            cases={seen(shown.feature.id) ?? {}}
            who={who}
            recordedOn={iphone ? "in the iPhone app" : mine.includes(shown.feature.id) ? undefined : recordedOn && `on ${recordedOn}`}
          />
          {(shown.kind === "device" || shown.kind === "cloud" || shown.kind === "fix") && (
            <p className="tally">
              {countLine(shown, who)} {shown.unsure && <b>{unsureLine(shown, who)}</b>}
            </p>
          )}
        </div>
        {/* One more line is tried where it can change something: a feature kept in the cloud, or one on the device that still gets inputs wrong. */}
        {(shown.kind === "cloud" || (shown.kind === "device" && shown.failures.some((f) => f.side !== "cloud"))) && shown.feature.heldBack?.length && held?.[shown.feature.id] && (
          <Fixes
            feature={shown.feature}
            who={who}
            onDevice={shown.kind === "device"}
            base={seen(shown.feature.id)!}
            heldBase={iphone ? onApple(held[shown.feature.id]) : held[shown.feature.id]}
            fixes={fixesFor(fixes, shown.feature, iphone)}
            shipped={placed[verdicts.indexOf(shown)].fix}
            allowed={allowed}
            canRun={canRun}
            canTry={!iphone}
            onFix={onFix && ((fix) => onFix(shown.feature.id, fix))}
          />
        )}

        {neither.length > 0 && (
          <section className="neither" id="neither">
            <h2>
              <b>{neither.length}</b> <span>on neither side yet</span>
            </h2>
            <ul>{neither.map((v) => row(v, true))}</ul>
          </section>
        )}
      </div>
      {iphone ? belowOnIphone : below}
      <BottomLine
        verdicts={verdicts}
        allowed={allowed}
        shop={!!recordedOn}
        iphone={iphone}
        afterFixes={placed.filter(runsOnDevice).length}
        bySetting={placed.some((p) => p.fix?.steady)}
        said={said}
      />
      {handsOver && chrome.every((v) => v.kind !== "pending") && (
        <Apply chrome={chromePlaced} apple={applePlaced}>
          {children}
        </Apply>
      )}
    </>
  );
}
