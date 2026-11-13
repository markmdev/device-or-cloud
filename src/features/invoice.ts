import { fields, money, type Case, type Feature } from "./types";

type Order = {
  lines: [quantity: number, item: string, unitPence: number][];
  discountPercent?: number;
  vatPercent?: number;
  deliveryPence?: number;
};

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

function toCase(o: Order, i: number): Case {
  const goods = o.lines.reduce((sum, [quantity, , unit]) => sum + quantity * unit, 0);
  const total = Math.round((goods * (100 - (o.discountPercent ?? 0)) * (100 + (o.vatPercent ?? 0))) / 10000) + (o.deliveryPence ?? 0);
  const lines = [
    ...o.lines.map(([quantity, item, unit]) => `${quantity} x ${item} at ${pounds(unit)} each`),
    ...(o.discountPercent ? [`Discount: ${o.discountPercent}% off the goods`] : []),
    ...(o.vatPercent ? [`VAT: ${o.vatPercent}% on the goods${o.discountPercent ? " after the discount" : ""}`] : []),
    ...(o.deliveryPence ? [`Delivery: ${pounds(o.deliveryPence)}${o.vatPercent ? ", added after VAT" : ""}`] : []),
  ];
  const extras = [o.discountPercent && "a discount", o.vatPercent && "VAT", o.deliveryPence && "delivery"].filter(Boolean);
  const kind =
    extras.length === 0 ? "orders with nothing to add or take off"
    : extras.length === 1 ? `orders with ${extras[0]}`
    : `orders with ${extras.slice(0, -1).join(", ")} and ${extras.at(-1)}`;
  return { id: `invoice-${i + 1}`, input: lines.join("\n"), expect: { total: total / 100 }, kind };
}

const orders: Order[] = [
  { lines: [[2, "Garden bench", 12900]] },
  { lines: [[4, "Terracotta pot 40cm", 1850], [1, "Potting table", 8900]] },
  { lines: [[10, "Bag of compost 50L", 799]] },
  { lines: [[3, "Solar path light", 1499], [2, "Hose reel", 3450]] },
  { lines: [[6, "Dining chair", 4850], [1, "Dining table", 21500]] },
  { lines: [[5, "Wool throw", 3900]], discountPercent: 10 },
  { lines: [[12, "Tea towel", 650], [4, "Apron", 1800]], discountPercent: 15 },
  { lines: [[2, "Floor lamp", 7450]], discountPercent: 20 },
  { lines: [[8, "Picture frame A3", 1275]], discountPercent: 5 },
  { lines: [[3, "Bookcase", 11900], [3, "Shelf insert", 1450]], discountPercent: 10 },
  { lines: [[20, "Paving slab", 895]], vatPercent: 20 },
  { lines: [[1, "Garden shed 6x4", 34900]], vatPercent: 20 },
  { lines: [[15, "Fence panel", 2750], [16, "Fence post", 1125]], vatPercent: 20 },
  { lines: [[7, "Planter box", 2360]], vatPercent: 20 },
  { lines: [[2, "Wheelbarrow", 5999], [4, "Spade", 2249]], vatPercent: 20 },
  { lines: [[12, "Oak dining chair", 4850], [3, "Extending table", 21500]], discountPercent: 10, vatPercent: 20, deliveryPence: 3500 },
  { lines: [[40, "Decking board 3.6m", 1195]], discountPercent: 5, vatPercent: 20, deliveryPence: 4500 },
  { lines: [[6, "Rattan armchair", 8900], [2, "Coffee table", 6450]], discountPercent: 12, vatPercent: 20, deliveryPence: 2500 },
  { lines: [[25, "Bistro chair", 3200], [8, "Bistro table", 5600]], discountPercent: 15, vatPercent: 20, deliveryPence: 6000 },
  { lines: [[3, "Greenhouse 6x8", 41900]], discountPercent: 7.5, vatPercent: 20, deliveryPence: 9500 },
  { lines: [[18, "Raised bed kit", 4675]], vatPercent: 20, deliveryPence: 3000 },
  { lines: [[9, "Parasol 2.7m", 5450], [9, "Parasol base", 2895]], discountPercent: 10, deliveryPence: 1995 },
  { lines: [[30, "Outdoor cushion", 1640]], discountPercent: 20, vatPercent: 20 },
  { lines: [[4, "Fire pit", 13900], [4, "Fire pit cover", 2150], [10, "Log bag", 695]], discountPercent: 10, vatPercent: 20, deliveryPence: 4000 },
  { lines: [[14, "Window box", 1785], [14, "Bracket set", 640]], discountPercent: 2.5, vatPercent: 20, deliveryPence: 1250 },
];

export const invoice: Feature = {
  id: "invoice_total",
  name: "Work out an invoice total",
  system:
    "You work out the total of a trade order for an invoice from Larkfield, an online home and garden shop. Reply with the total to pay in pounds as a number.",
  ...fields({ total: { type: "number", same: money } }),
  cases: orders.map(toCase),
};
