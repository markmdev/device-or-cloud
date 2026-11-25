import { fields, money, type Case, type Feature } from "./types";

type Order = {
  lines: [quantity: number, item: string, unitPence: number][];
  discountPercent?: number;
  vatPercent?: number;
  deliveryPence?: number;
};

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export function totalOf(o: Order): number {
  const goods = o.lines.reduce((sum, [quantity, , unit]) => sum + quantity * unit, 0);
  return Math.round((goods * (100 - (o.discountPercent ?? 0)) * (100 + (o.vatPercent ?? 0))) / 10000) + (o.deliveryPence ?? 0);
}

const PENCE = /£(\d+(?:\.\d{1,2})?)/;
const toPence = (text: string) => Math.round(Number(PENCE.exec(text)![1]) * 100);

export function orderOf(text: string): Order | string {
  const order: Order = { lines: [] };
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const item = /^(\d+) x (.+) at £\d+(?:\.\d{1,2})? each$/i.exec(line);
    const percent = /(\d+(?:\.\d+)?)%/.exec(line);
    if (item) order.lines.push([Number(item[1]), item[2], toPence(line)]);
    else if (/^discount:/i.test(line) && percent) order.discountPercent = Number(percent[1]);
    else if (/^vat:/i.test(line) && percent) order.vatPercent = Number(percent[1]);
    else if (/^delivery:/i.test(line) && PENCE.test(line)) order.deliveryPence = toPence(line);
    else return line;
  }
  return order.lines.length ? order : text.trim();
}

function toCase(o: Order, i: number): Case {
  const total = totalOf(o);
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
  { lines: [[3, "Garden gate", 8450]] },
  { lines: [[5, "Hanging basket", 1295], [2, "Wall bracket", 875]] },
  { lines: [[24, "Roof tile", 345]] },
  { lines: [[2, "Log store", 15900], [6, "Kindling net", 495]] },
  { lines: [[8, "Stacking chair", 3675], [2, "Folding table", 9800]] },
  { lines: [[4, "Linen cushion", 2400]], discountPercent: 25 },
  { lines: [[10, "Bath towel", 1450], [10, "Hand towel", 750]], discountPercent: 10 },
  { lines: [[3, "Table lamp", 5200]], discountPercent: 15 },
  { lines: [[16, "Candle holder", 925]], discountPercent: 5 },
  { lines: [[2, "Sideboard", 28900], [1, "Wall mirror", 7600]], discountPercent: 20 },
  { lines: [[50, "Edging stone", 460]], vatPercent: 20 },
  { lines: [[1, "Summer house 8x6", 129500]], vatPercent: 20 },
  { lines: [[12, "Trellis panel", 1890], [24, "Fixing clip pack", 275]], vatPercent: 20 },
  { lines: [[9, "Water butt 200L", 3340]], vatPercent: 20 },
  { lines: [[3, "Lawn roller", 7250], [5, "Rake", 1680]], vatPercent: 20 },
  { lines: [[10, "Cafe chair", 4200], [4, "Cafe table", 9500]], discountPercent: 10, vatPercent: 20, deliveryPence: 4000 },
  { lines: [[60, "Scaffold board 2.4m", 1450]], discountPercent: 5, vatPercent: 20, deliveryPence: 5500 },
  { lines: [[8, "Sun lounger", 11900], [8, "Lounger cushion", 3250]], discountPercent: 15, vatPercent: 20, deliveryPence: 3500 },
  { lines: [[20, "Patio heater", 8950]], discountPercent: 12, vatPercent: 20, deliveryPence: 7500 },
  { lines: [[2, "Pergola kit", 56400]], discountPercent: 7.5, vatPercent: 20, deliveryPence: 12000 },
  { lines: [[14, "Cold frame", 6230]], vatPercent: 20, deliveryPence: 2500 },
  { lines: [[6, "Garden arch", 7450], [6, "Arch anchor set", 1295]], discountPercent: 10, deliveryPence: 1995 },
  { lines: [[45, "Seat pad", 1180]], discountPercent: 20, vatPercent: 20 },
  { lines: [[5, "Chiminea", 9900], [5, "Chiminea cover", 1850], [12, "Bag of kiln-dried logs", 795]], discountPercent: 10, vatPercent: 20, deliveryPence: 4500 },
  { lines: [[18, "Balcony planter", 2265], [18, "Rail hook pair", 580]], discountPercent: 2.5, vatPercent: 20, deliveryPence: 1500 },
];

export const invoice: Feature = {
  id: "invoice_total",
  name: "Work out an invoice total",
  system:
    "You work out the total of a trade order for an invoice from Larkfield, an online home and garden shop. Reply with the total to pay in pounds as a number.",
  ...fields({ total: { type: "number", same: money } }),
  cases: orders.map(toCase),
};
