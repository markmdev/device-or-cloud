import { parse, shown } from "./features/types";

/** An answer as a person reads it: a JSON object as rows, anything else as text. */
export function AnswerText({ text }: { text: string }) {
  const object = parse(text);
  if (!object) return <p className="answer">{text}</p>;
  return (
    <dl className="answer">
      {Object.entries(object).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{shown(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export const SOURCE_LABEL = { on_device: "Ran on this computer", in_cloud: "Ran in the cloud" } as const;
