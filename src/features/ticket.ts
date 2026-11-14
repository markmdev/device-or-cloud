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
  ["billing", PLAIN, "I've been charged for two garden benches but I only ordered one. Order #91220."],
  ["delivery", PLAIN, "Tracking says my parcel is at the depot and has been for five days. When will it move?"],
  ["returns", PLAIN, "The curtains are the wrong shade of green. I'd like to send them back, how does that work?"],
  ["account", PLAIN, "My password stopped working this morning and the reset link says it has expired."],
  ["other", PLAIN, "Do you offer a discount for charities buying garden furniture?"],
  ["billing", PLAIN, "Can I pay for a large order in instalments, or by bank transfer?"],
  ["delivery", PLAIN, "My order arrived but the box of tiles is missing from it. Only the grout came."],
  ["returns", PLAIN, "The slippers are a size too small. Can I exchange them for a 9?"],
  ["account", PLAIN, "I'm getting your emails at two addresses. Please remove the old one from my account."],
  ["other", PLAIN, "What are the opening hours of your showroom in York?"],
  ["delivery", PLAIN, "The driver left my parcel out in the rain by the bins and the cushions inside are soaked."],
  ["billing", PLAIN, "I need a copy of the invoice for order #77312 for an insurance claim."],
  ["account", PLAIN, "How do I turn on two-step sign-in for my account?"],
  ["other", PLAIN, "Is the paint on the children's table safe for toddlers?"],
  ["returns", PLAIN, "I ordered the wrong size of fire guard. What's the address to post it back to?"],
  ["delivery", TWO, "The lamp I bought last year is still going strong, thank you. My new order, though, was promised for Friday and hasn't turned up."],
  ["account", TWO, "Great service on my last return. Now I can't log in to place a new order: it says my email isn't recognised."],
  ["billing", TWO, "The parcel came on time, thanks. But I've been charged £15 more than the price on the confirmation email."],
  ["billing", MISLEADING, "I sent the heater back last month and the refund still isn't showing on my statement."],
  ["delivery", MISLEADING, "My account says the order was delivered on Monday, but nothing has arrived."],
  ["returns", MISLEADING, "The delivery was fine, but the wardrobe is too tall for the room and needs to go back."],
  ["account", MISLEADING, "I can't get to my invoices because the sign-in page keeps rejecting my password."],
  ["billing", NO_KEYWORD, "It's been three weeks since you collected the table and my bank still shows nothing back."],
  ["delivery", NO_KEYWORD, "It was supposed to be here on Tuesday. It's now Friday and still nothing."],
  ["account", NO_KEYWORD, "I keep being asked to prove who I am with a code, and the code never comes."],
];

const heldBack: [string, string][] = [
  ["billing", "My refund for the returned blender was promised in five days. That was two weeks ago."],
  ["returns", "How do I send back a rug that's the wrong colour?"],
  ["delivery", "Where is my order? It was due yesterday."],
  ["account", "The reset email for my password never arrives."],
  ["billing", "I was charged twice for the same toaster."],
  ["returns", "Can I swap the single duvet for a double?"],
  ["billing", "You picked up the faulty mower on the 2nd and I'm still waiting for my money."],
  ["other", "Can I book someone to assemble the shed for me?"],
  ["delivery", "Half the plates in my parcel arrived cracked."],
  ["account", "Please update the phone number and email you have for me."],
];

export const ticket: Feature = {
  id: "ticket_route",
  name: "Route a support ticket",
  system:
    "You sort messages sent to the help desk of Larkfield, an online home and garden shop. Reply with the one team that should handle the message. billing: charges, refunds that haven't arrived, invoices, ways to pay. delivery: where an order is, and late, damaged or missing parcels. returns: sending an item back or exchanging it. account: signing in, passwords, email and saved addresses. other: anything else.",
  ...label(["billing", "delivery", "returns", "account", "other"]),
  cases: rows.map(([expect, kind, input], i): Case => ({ id: `ticket-${i + 1}`, input, expect, kind })),
  heldBack: heldBack.map(([expect, input], i): Case => ({ id: `ticket-held-${i + 1}`, input, expect, kind: "held back" })),
};
