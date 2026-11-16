import { useEffect, useState, type ReactNode } from "react";
import { parse, shown } from "./features/types";

/**
 * A field's value as a person reads it: a nested object as its names and values, a list of them one to a line.
 * `end` follows the last word, where an answer carries its mark.
 */
export function Value({ value, end }: { value: unknown; end?: ReactNode }) {
  if (Array.isArray(value) && value.some((v) => typeof v === "object" && v !== null)) {
    return (
      <span className="rows">
        {value.map((v, i) => (
          <span key={i}>
            {typeof v === "object" && v !== null && !Array.isArray(v) ? Object.values(v).map(shown).join(" · ") : <Value value={v} />}
            {i === value.length - 1 && end}
          </span>
        ))}
      </span>
    );
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const fields = Object.entries(value);
    return (
      <span className="pairs">
        {fields.map(([key, v], i) => (
          <span key={key}>
            <i>{key}</i> <Value value={v} />
            {i === fields.length - 1 && end}
          </span>
        ))}
      </span>
    );
  }
  return (
    <>
      {Array.isArray(value) ? value.map(shown).join(", ") || "(empty)" : shown(value)}
      {end}
    </>
  );
}

/** The picture a model's SVG code draws, as an address an image can show. Nothing in it can run. */
export function drawn(text: string): string | undefined {
  const code = /<svg[\s>][\s\S]*<\/svg>/.exec(text)?.[0];
  if (!code) return undefined;
  const named = /^<svg[^>]*\sxmlns=/.test(code) ? code : code.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(named)}`;
}

const LINES_SHOWN = 12;
/** Too long to set large beside another answer. */
export const isLong = (text: string) => text.length > 140 || text.split("\n").length > 3;
const isCut = (text: string) => text.split("\n").length > LINES_SHOWN || text.length > LINES_SHOWN * 46;

/**
 * A long answer in mono, cut to its first lines until the reader asks for the rest. Code that draws a picture shows
 * the picture too. `children` is the answer's mark, in the corner.
 */
export function LongText({ text, children }: { text: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [text]);
  const picture = drawn(text);
  const lines = text.split("\n").length;
  const cut = isCut(text);
  return (
    <div className="long" data-open={open || !cut}>
      {children}
      {picture && <img src={picture} loading="lazy" alt="The picture this code draws" onError={(e) => (e.currentTarget.hidden = true)} />}
      <pre>{text}</pre>
      {cut && <button onClick={() => setOpen(!open)}>{open ? "Show less" : lines > LINES_SHOWN ? `Show all ${lines} lines` : "Show the whole answer"}</button>}
    </div>
  );
}

/** An answer as a person reads it: a JSON object as rows, a long text cut to its first lines, anything else as text. */
export function AnswerText({ text }: { text: string }) {
  const object = parse(text);
  if (!object) return isCut(text) || drawn(text) ? <LongText text={text} /> : <p className="answer">{text}</p>;
  return (
    <dl className="answer">
      {Object.entries(object).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>
            <Value value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export const SOURCE_LABEL = { on_device: "Ran on this computer", in_cloud: "Ran in the cloud" } as const;
