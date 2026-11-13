import { label, type Case, type Feature } from "./types";

const PLAIN = "plain messages";
const TWO = "messages that mention two things";
const MISLEADING = "messages with a word that points to the wrong team";
const NO_KEYWORD = "messages that never name their subject";

const rows: [string, string, string][] = [
  ["billing", PLAIN, "I was charged twice for order #88213, once on the 3rd and again on the 4th. Please refund one of them."],
  ["delivery", PLAIN, "My parcel was due on Tuesday and the tracking hasn't moved since Saturday. Where is it?"],
  ["returns", PLAIN, "The lamp is lovely but too big for the shelf. How do I send it back?"],
  ["account", PLAIN, "I can't sign in. The password reset email never arrives."],
  ["other", PLAIN, "Do you sell gift cards?"],
  ["billing", PLAIN, "Can I have a VAT invoice for order #90417 for my company's records?"],
  ["delivery", PLAIN, "The box arrived crushed and two of the six glasses are broken."],
  ["returns", PLAIN, "I'd like to swap the medium gardening gloves for a large pair."],
  ["account", PLAIN, "Please change the email on my account to my new work address."],
  ["billing", PLAIN, "My card was declined at checkout but the money has left my bank account."],
  ["delivery", PLAIN, "The courier left a card saying they missed me, but I was home all day. Can it be redelivered tomorrow?"],
  ["account", PLAIN, "I want to delete my account and all the data you hold on me."],
  ["other", PLAIN, "I'd like to work for Larkfield. Where do I send my CV?"],
  ["other", PLAIN, "Is the oak bookcase suitable for a damp conservatory?"],
  ["returns", PLAIN, "The drill stopped working after three weeks. I'd like a replacement or to send it back."],
  ["billing", TWO, "Thanks for the fast delivery! One question: the invoice shows the wrong company name. Can you correct it?"],
  ["returns", TWO, "Before I order: if the rug doesn't suit the room, can I send it back?"],
  ["delivery", TWO, "I love the chairs I bought last month. This time though, the order shows as delivered and there's nothing here, and none of the neighbours have it."],
  ["billing", MISLEADING, "I returned the kettle two weeks ago and still haven't had my money back."],
  ["account", MISLEADING, "I've moved house. Please update my saved delivery address, the old one keeps appearing at checkout."],
  ["billing", MISLEADING, "Why was I charged £4.99 delivery when the site said free delivery over £50? My order was £62."],
  ["billing", MISLEADING, "The discount code SPRING10 didn't come off my total at checkout. I paid full price."],
  ["billing", NO_KEYWORD, "It's been 12 days and the money for the chair I sent back hasn't reached my card."],
  ["account", NO_KEYWORD, "Someone else's order history shows up when I log in."],
  ["account", NO_KEYWORD, "I forgot which email I used to register. I only know my order number."],
];

export const ticket: Feature = {
  id: "ticket_route",
  name: "Route a support ticket",
  system:
    "You sort messages sent to the help desk of Larkfield, an online home and garden shop. Reply with the one team that should handle the message. billing: charges, refunds that haven't arrived, invoices, ways to pay. delivery: where an order is, and late, damaged or missing parcels. returns: sending an item back or exchanging it. account: signing in, passwords, email and saved addresses. other: anything else.",
  ...label(["billing", "delivery", "returns", "account", "other"]),
  cases: rows.map(([expect, kind, input], i): Case => ({ id: `ticket-${i + 1}`, input, expect, kind })),
};
