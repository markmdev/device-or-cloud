import { fields, type Case, type Feature } from "./types";

type DateParts = [year: number, month: number, day: number];
type Request = {
  delivered: DateParts;
  today: DateParts;
  item: "ordinary" | "made for the customer" | "plant";
  faulty?: boolean;
  /** The customer's words; {delivered} marks where the delivery date goes. */
  says: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const written = ([y, m, d]: DateParts) => `${d} ${MONTHS[m - 1]} ${y}`;
const daysBetween = (a: DateParts, b: DateParts) => Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000);

function toCase(r: Request, i: number): Case {
  const days = daysBetween(r.delivered, r.today);
  const limit = r.faulty ? 365 : r.item === "plant" ? 14 : 30;
  const allowed = r.faulty ? days <= limit : r.item !== "made for the customer" && days <= limit;
  const kind =
    r.faulty ? "faulty items"
    : r.item === "made for the customer" ? "made-to-order and personalised items"
    : Math.abs(days - limit) <= 2 ? "requests a day or two either side of the time limit"
    : r.item === "plant" ? "plants and seeds"
    : "requests well inside or well past the time limit";
  return {
    id: `returns-${i + 1}`,
    input: `Today is ${written(r.today)}.\n${r.says.replace("{delivered}", written(r.delivered))}`,
    expect: { allowed },
    kind,
  };
}

const TODAY: DateParts = [2026, 11, 14];

const requests: Request[] = [
  { delivered: [2026, 11, 9], today: TODAY, item: "ordinary", says: "My desk lamp arrived on {delivered}. It's fine, I've just changed my mind. Can I send it back?" },
  { delivered: [2026, 11, 2], today: TODAY, item: "ordinary", says: "The set of bath towels was delivered on {delivered}. The colour doesn't match the bathroom. Can I return them?" },
  { delivered: [2026, 10, 30], today: TODAY, item: "ordinary", says: "I bought a doormat in your sale, delivered {delivered}. It's too small. Do sale items go back?" },
  { delivered: [2026, 8, 20], today: TODAY, item: "ordinary", says: "I'd like to return the garden parasol that came on {delivered}. We never used it." },
  { delivered: [2026, 9, 1], today: TODAY, item: "ordinary", says: "Can I return a bookcase? It was delivered on {delivered} and it's still boxed." },
  { delivered: [2026, 11, 6], today: TODAY, item: "ordinary", says: "The wall clock came on {delivered}. I threw the box away. Can I still return it?" },
  { delivered: [2026, 6, 3], today: TODAY, item: "ordinary", says: "I ordered six dining chairs, delivered {delivered}, and we've decided they don't suit the room. Can they go back?" },
  { delivered: [2026, 10, 15], today: TODAY, item: "ordinary", says: "My rug was delivered on {delivered}. I'd like to return it. Am I still in time?" },
  { delivered: [2026, 10, 14], today: TODAY, item: "ordinary", says: "The coffee table arrived on {delivered} and I want to send it back. Is that still possible?" },
  { delivered: [2026, 10, 16], today: TODAY, item: "ordinary", says: "The kettle I ordered came on {delivered}. I haven't opened it. Can I return it?" },
  { delivered: [2026, 10, 13], today: TODAY, item: "ordinary", says: "A mirror was delivered to me on {delivered}. It's too big for the hallway. Can I return it?" },
  { delivered: [2026, 9, 30], today: [2026, 10, 30], item: "ordinary", says: "The cushion covers arrived on {delivered}. I'd like to return them, please." },
  { delivered: [2026, 9, 30], today: [2026, 10, 31], item: "ordinary", says: "The curtain pole was delivered on {delivered}. I'd like to send it back." },
  { delivered: [2026, 11, 10], today: TODAY, item: "made for the customer", says: "The doormat with our family name on it came on {delivered}. The font looks different from what I imagined. Can I return it?" },
  { delivered: [2026, 11, 3], today: TODAY, item: "made for the customer", says: "I ordered curtains made to my window measurements, delivered {delivered}. I've changed my mind about the colour. Can they go back?" },
  { delivered: [2026, 11, 12], today: TODAY, item: "made for the customer", says: "The chopping board engraved for my parents' anniversary arrived on {delivered}. They already have one. Can I return it?" },
  { delivered: [2026, 11, 8], today: TODAY, item: "plant", says: "The olive tree was delivered on {delivered}. It's bigger than I expected. Can I return it?" },
  { delivered: [2026, 10, 20], today: TODAY, item: "plant", says: "I bought three packets of wildflower seeds, delivered {delivered}. I haven't opened them. Can I send them back?" },
  { delivered: [2026, 10, 31], today: TODAY, item: "plant", says: "The potted lavender came on {delivered} and I've decided I don't want it. Can it go back?" },
  { delivered: [2026, 10, 30], today: TODAY, item: "plant", says: "My rose bush arrived on {delivered}. I'd like to return it. Am I in time?" },
  { delivered: [2026, 7, 6], today: TODAY, item: "ordinary", faulty: true, says: "The electric hedge trimmer delivered on {delivered} has stopped charging. Can I return it?" },
  { delivered: [2026, 2, 17], today: TODAY, item: "ordinary", faulty: true, says: "My patio heater came on {delivered} and the switch has broken. Can I send it back?" },
  { delivered: [2025, 9, 8], today: TODAY, item: "ordinary", faulty: true, says: "The garden hose reel was delivered on {delivered}. It has started leaking at the handle. Can I return it?" },
  { delivered: [2026, 10, 5], today: TODAY, item: "made for the customer", faulty: true, says: "The blind made to measure for my kitchen arrived on {delivered} and the cord mechanism doesn't work. Can I return it?" },
  { delivered: [2026, 10, 1], today: TODAY, item: "plant", faulty: true, says: "The bay tree delivered on {delivered} came in a cracked pot with the main stem snapped. Can I return it?" },
];

export const returns: Feature = {
  id: "returns_answer",
  name: "Answer a returns question",
  system:
    "You answer customers of Larkfield, an online home and garden shop, who ask whether they can return an item. The returns policy: an item can be returned within 30 days of the day it was delivered, and the original packaging isn't needed. Sale items can be returned like any other. Plants and seeds can be returned within 14 days of delivery. Items made to order or personalised can't be returned. A faulty item of any kind can be returned within 12 months of delivery. Reply with whether this return is allowed and one friendly sentence for the customer.",
  ...fields({ allowed: { type: "boolean" }, reply: { type: "string" } }, ["allowed"]),
  cases: requests.map(toCase),
};
