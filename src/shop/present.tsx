import type { ReactNode } from "react";
import { AnswerText } from "../answer";
import type { Feature } from "../features";
import { parse } from "../features/types";

type Shown = { label: string; heading: string; button: string; result(answer: Record<string, unknown>, text: string): ReactNode };

const longDate = (iso: unknown) => {
  const date = new Date(String(iso));
  return isNaN(date.getTime()) ? String(iso) : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};
const pounds = (n: unknown) => (typeof n === "number" ? `£${n.toFixed(2)}` : String(n));
const rows = (pairs: [string, string][]) => (
  <dl className="answer">
    {pairs.map(([k, v]) => (
      <div key={k}>
        <dt>{k}</dt>
        <dd>{v || "(not given)"}</dd>
      </div>
    ))}
  </dl>
);
const TEAMS: Record<string, string> = { billing: "billing", delivery: "delivery", returns: "returns", account: "accounts", other: "general enquiries" };

/** How the shop words each feature and shows its answer to a customer. */
export const SHOWN: Record<string, Shown> = {
  ticket_route: { label: "Help", heading: "Tell us what went wrong", button: "Send", result: (a) => <p className="big">Sent to our {TEAMS[String(a.label)] ?? String(a.label)} team.</p> },
  review_mood: { label: "Reviews", heading: "Leave a review", button: "Post review", result: (a) => <p className="big">Filed as a {String(a.label)} review.</p> },
  receipt_fields: {
    label: "Rewards",
    heading: "Paste a receipt from a partner shop",
    button: "Collect points",
    result: (a) => rows([["Shop", String(a.merchant)], ["Date", longDate(a.date)], ["Paid", pounds(a.total)]]),
  },
  product_title: { label: "Sell with us", heading: "Describe your product", button: "Write my title", result: (_, text) => <p className="big">{text}</p> },
  delivery_summary: { label: "Orders", heading: "The courier's note on your order", button: "Tell me what it means", result: (_, text) => <p className="big">{text}</p> },
  invoice_total: { label: "Trade", heading: "Your trade order", button: "Work out my total", result: (a) => <p className="big">Total to pay: {pounds(a.total)}</p> },
  email_address: {
    label: "Delivery",
    heading: "Email us where to deliver",
    button: "Read my address",
    result: (a) => rows([["Name", String(a.name)], ["Street", String(a.street)], ["Town", String(a.city)], ["Postcode", String(a.postcode)]]),
  },
  returns_answer: {
    label: "Returns",
    heading: "Can I send it back?",
    button: "Ask",
    result: (a) => (
      <>
        <p className="big">{a.allowed ? "Yes, you can return it." : "No, this one can't come back."}</p>
        <p>{String(a.reply)}</p>
      </>
    ),
  },
};

export function Result({ feature, text }: { feature: Feature; text: string }) {
  const object = parse(text);
  if (feature.schema && !object) return <AnswerText text={text} />;
  return <>{SHOWN[feature.id].result(object ?? {}, text)}</>;
}
