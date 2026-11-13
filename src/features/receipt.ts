import { fields, money, type Case, type Feature } from "./types";

type Style = "dash" | "slash" | "short" | "dot" | "mon" | "long" | "iso";
type Receipt = {
  shop: string;
  /** Printed in capitals, as tills often do. */
  caps?: boolean;
  date: [year: number, month: number, day: number];
  style: Style;
  /** The line the date is printed on; {date} marks its place. */
  dateLine: string;
  items: [name: string, pence: number][];
  servicePercent?: number;
  totalLabel: string;
  cashPence?: number;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const two = (n: number) => String(n).padStart(2, "0");
const pounds = (pence: number) => (pence / 100).toFixed(2);

function printed([y, m, d]: Receipt["date"], style: Style): string {
  switch (style) {
    case "dash": return `${two(d)}-${two(m)}-${y}`;
    case "slash": return `${two(d)}/${two(m)}/${y}`;
    case "short": return `${two(d)}/${two(m)}/${String(y).slice(2)}`;
    case "dot": return `${two(d)}.${two(m)}.${y}`;
    case "mon": return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
    case "long": return `${d} ${MONTHS[m - 1]} ${y}`;
    case "iso": return `${y}-${two(m)}-${two(d)}`;
  }
}

const DAY_FIRST = "dates written day first in numbers, like 12-11-2026";

function toCase(r: Receipt, i: number): Case {
  const [y, m, d] = r.date;
  const goods = r.items.reduce((sum, [, pence]) => sum + pence, 0);
  const service = r.servicePercent ? Math.round((goods * r.servicePercent) / 100) : 0;
  const total = goods + service;
  const lines = [
    r.caps ? r.shop.toUpperCase() : r.shop,
    r.dateLine.replace("{date}", printed(r.date, r.style)),
    ...r.items.map(([name, pence]) => `${name} ${pounds(pence)}`),
    ...(service ? [`Subtotal ${pounds(goods)}`, `Service ${r.servicePercent}% ${pounds(service)}`] : []),
    `${r.totalLabel} ${pounds(total)}`,
    ...(r.cashPence ? [`Cash ${pounds(r.cashPence)}  Change ${pounds(r.cashPence - total)}`] : []),
  ];
  const numbersOnly = r.style === "dash" || r.style === "slash" || r.style === "short" || r.style === "dot";
  const kind =
    numbersOnly && d <= 12 && d !== m ? DAY_FIRST
    : r.cashPence ? "receipts that also show cash and change"
    : service ? "receipts with a service charge"
    : "plain receipts";
  return {
    id: `receipt-${i + 1}`,
    input: lines.join("\n"),
    expect: { merchant: r.shop, date: `${y}-${two(m)}-${two(d)}`, total: total / 100 },
    kind,
  };
}

const receipts: Receipt[] = [
  { shop: "The Copper Kettle", caps: true, date: [2026, 11, 12], style: "dash", dateLine: "Table 6  {date}", items: [["2 x Flat white", 680], ["1 x Carrot cake", 420]], servicePercent: 12.5, totalLabel: "Amount paid" },
  { shop: "Greenleaf Market", caps: true, date: [2026, 11, 7], style: "slash", dateLine: "{date} 18:42", items: [["Oat milk", 195], ["Bananas", 89], ["Bread", 240]], totalLabel: "TOTAL" },
  { shop: "Northgate Hardware", date: [2026, 11, 3], style: "dot", dateLine: "Date {date}", items: [["Wood screws 4x40 box", 475], ["Sandpaper pack", 320], ["Masking tape", 265]], totalLabel: "Total" },
  { shop: "Mill Lane Bakery", date: [2026, 10, 5], style: "short", dateLine: "{date}  08:15", items: [["Sourdough loaf", 420], ["Cinnamon bun x2", 500]], totalLabel: "Total paid", cashPence: 1000 },
  { shop: "Fernhill Garden Centre", caps: true, date: [2026, 10, 9], style: "dash", dateLine: "Till 3  {date}", items: [["Compost 50L", 799], ["Tulip bulbs x20", 650], ["Hand trowel", 899]], totalLabel: "TOTAL DUE" },
  { shop: "Saltmarsh Deli", date: [2026, 11, 4], style: "short", dateLine: "Served by Jo  {date}", items: [["Olives 200g", 380], ["Sourdough crackers", 295], ["Goat's cheese", 540]], totalLabel: "Total" },
  { shop: "Ivy House Books", date: [2026, 10, 8], style: "dot", dateLine: "{date}", items: [["Paperback", 999], ["Greeting card", 325]], totalLabel: "Amount paid" },
  { shop: "The Blue Door Tea Room", caps: true, date: [2026, 11, 2], style: "slash", dateLine: "Table 2  {date}", items: [["Cream tea for two", 1700], ["Pot of Assam", 390]], servicePercent: 10, totalLabel: "Total" },
  { shop: "Castle Street Cycles", date: [2026, 10, 25], style: "slash", dateLine: "Date: {date}", items: [["Inner tube 700c", 650], ["Brake pads pair", 1299]], totalLabel: "Total" },
  { shop: "Hollins Farm Shop", caps: true, date: [2026, 11, 13], style: "slash", dateLine: "{date} 10:07", items: [["Free range eggs x12", 420], ["Apple juice 1L", 350], ["Potatoes 2kg", 280]], totalLabel: "TOTAL", cashPence: 2000 },
  { shop: "Willow Row Florist", date: [2026, 10, 28], style: "dot", dateLine: "Order 0412  {date}", items: [["Hand-tied bouquet", 3200], ["Gift card", 150]], totalLabel: "Paid" },
  { shop: "Quayside Fishmongers", date: [2026, 10, 19], style: "short", dateLine: "{date}", items: [["Haddock fillet 400g", 760], ["Smoked mackerel", 445]], totalLabel: "Total", cashPence: 1500 },
  { shop: "Old Forge Ironmongers", caps: true, date: [2026, 10, 31], style: "dash", dateLine: "Receipt 2291  {date}", items: [["Padlock 40mm", 1150], ["Cable ties x100", 399]], totalLabel: "TOTAL" },
  { shop: "Harbour Pharmacy", date: [2026, 11, 2], style: "mon", dateLine: "Date: {date}", items: [["Plasters", 215], ["Hand cream", 349]], totalLabel: "Total due", cashPence: 1000 },
  { shop: "Brook & Barley", date: [2026, 10, 14], style: "long", dateLine: "{date}", items: [["Lunch special x2", 2400], ["Sparkling water", 350]], servicePercent: 12.5, totalLabel: "Amount paid" },
  { shop: "Larch & Pine", caps: true, date: [2026, 11, 6], style: "mon", dateLine: "{date}  14:20", items: [["Pine shelf 80cm", 1899], ["Brackets pair", 650]], totalLabel: "TOTAL" },
  { shop: "Beacon Hill Pet Supplies", date: [2026, 11, 7], style: "long", dateLine: "Saturday {date}", items: [["Cat litter 10L", 899], ["Dog treats", 425], ["Bird seed 1kg", 310]], totalLabel: "Total" },
  { shop: "Tanner's Yard Cafe", date: [2026, 10, 23], style: "mon", dateLine: "Table 11  {date}", items: [["Soup of the day", 650], ["Toasted sandwich", 780], ["Tea x2", 520]], totalLabel: "Total", cashPence: 2000 },
  { shop: "Windmill Stores", caps: true, date: [2026, 11, 1], style: "long", dateLine: "{date}", items: [["Milk 2L", 165], ["Newspaper", 220], ["Stamps x4", 680]], totalLabel: "TOTAL" },
  { shop: "Foxglove Nurseries", date: [2026, 11, 2], style: "iso", dateLine: "{date} 11:32", items: [["Lavender 2L pot", 899], ["Terracotta pot 30cm", 1250]], totalLabel: "Total" },
  { shop: "Seven Stars Kitchenware", date: [2026, 10, 17], style: "iso", dateLine: "Invoice date {date}", items: [["Cast iron pan 26cm", 3450], ["Wooden spoon set", 895]], totalLabel: "Amount paid" },
  { shop: "The Paper Lantern", caps: true, date: [2026, 11, 10], style: "slash", dateLine: "{date}  19:55", items: [["Set menu x2", 3800], ["Jasmine tea", 300]], servicePercent: 10, totalLabel: "Total" },
  { shop: "Marlow's Greengrocer", date: [2026, 10, 6], style: "dash", dateLine: "{date}", items: [["Carrots 1kg", 95], ["Leeks x3", 180], ["Clementines net", 250]], totalLabel: "Total", cashPence: 1000 },
  { shop: "Ashby Road Dry Cleaners", date: [2026, 10, 20], style: "dash", dateLine: "Ticket 778  {date}", items: [["Suit two-piece", 1450], ["Shirt x3", 750]], totalLabel: "Paid" },
  { shop: "Orchard Lane Toys", date: [2026, 11, 9], style: "mon", dateLine: "Date {date}", items: [["Wooden train set", 2499], ["Jigsaw 500 piece", 1099]], totalLabel: "Total" },
];

export const receipt: Feature = {
  id: "receipt_fields",
  name: "Pull fields from a receipt",
  system:
    "You read the text of a till receipt from a shop in the UK, which a Larkfield customer has pasted in, and pull out the shop's name, the date as YYYY-MM-DD and the total the customer paid as a number.",
  ...fields({ merchant: { type: "string" }, date: { type: "string", same: (a, b) => a === b }, total: { type: "number", same: money } }),
  cases: receipts.map(toCase),
};
