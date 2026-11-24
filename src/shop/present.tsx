import type { ReactNode } from "react";
import { AnswerText } from "../answer";
import type { Feature } from "../features";
import { orderOf, totalOf } from "../features/invoice";
import { parse } from "../features/types";

type Shown = {
  label: string;
  heading: string;
  button: string;
  sample?: string;
  /** The input's first line is the shop's own, not the customer's. */
  ownFirstLine?: true;
  /** Where the check found neither model good enough and code can do it: the answer, worked out without a model. */
  inCode?(input: string): string;
  /** What the customer is told about the feature before they use it. */
  note?: string;
  result(answer: Record<string, unknown>, text: string): ReactNode;
};

/** What a card starts with: the customer's text in the box, and the line the shop puts before it, if it has one. */
export function sampleOf(feature: Feature): { added: string; text: string } {
  const shown = SHOWN[feature.id];
  const sample = shown.sample ?? feature.cases[0].input;
  const cut = shown.ownFirstLine ? sample.indexOf("\n") : -1;
  return { added: sample.slice(0, cut + 1), text: sample.slice(cut + 1) };
}

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
    sample: "LARKFIELD GARDEN CAFE\nTable 6  12-11-2026\n2 x Flat white 6.80\n1 x Carrot cake 4.20\nSubtotal 11.00\nService 12.5% 1.38\nAmount paid 12.38",
    result: (a) => rows([["Shop", String(a.merchant)], ["Date", longDate(a.date)], ["Paid", pounds(a.total)]]),
  },
  product_title: { label: "Sell with us", heading: "Describe your product", button: "Write my title", result: (_, text) => <p className="big">{text}</p> },
  delivery_summary: { label: "Orders", heading: "The courier's note on your order", button: "Tell me what it means", result: (_, text) => <p className="big">{text}</p> },
  invoice_total: {
    label: "Trade",
    heading: "Your trade order",
    button: "Work out my total",
    inCode(input) {
      const order = orderOf(input);
      if (typeof order === "string") throw new Error(`This line isn't one the trade form takes: "${order}". Write each line like "2 x Garden bench at £129.00 each", "Discount: 10% off the goods", "VAT: 20% on the goods" or "Delivery: £35.00".`);
      return JSON.stringify({ total: totalOf(order) / 100 });
    },
    result: (a) => <p className="big">Total to pay: {pounds(a.total)}</p>,
  },
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
    ownFirstLine: true,
    note: "The check found neither model good enough for this one. It still goes to the cloud model here, so some answers will be wrong.",
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
