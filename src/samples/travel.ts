import type { Case, Feature } from "../features/types";

const PLAIN = "general questions";
const FACTS = "questions that invite a made-up price, rule or number";
const FOLLOW = "questions about the chat so far";
const OFF = "questions that aren't about travel";

// The first is the sample's own prompt, word for word. The rest are ours.
const rows: [string, string][] = [
  [PLAIN, "What else is important when traveling?"],
  [PLAIN, "What should I pack for a one-week trip?"],
  [PLAIN, "How early should I get to the airport?"],
  [PLAIN, "Is travel insurance worth it?"],
  [PLAIN, "How do I keep my money safe while I'm away?"],
  [PLAIN, "What should I do if I lose my luggage?"],
  [PLAIN, "How can I avoid jet lag?"],
  [PLAIN, "Should I exchange money before I leave or when I arrive?"],
  [PLAIN, "I'm nervous about flying for the first time. Any advice?"],
  [FACTS, "How much does a visa for Japan cost for a Brazilian citizen?"],
  [FACTS, "What is the exact baggage allowance on Lufthansa economy flights?"],
  [FACTS, "Which vaccinations does Kenya require by law right now?"],
  [FACTS, "What's the cheapest month to fly from Chicago to Rome, and what will it cost?"],
  [FACTS, "How many millilitres of liquid can I take through security at Dubai airport?"],
  [FACTS, "What time does the last train leave Zurich airport for the city tonight?"],
  [FACTS, "What is the phone number of the British embassy in Bangkok?"],
  [FOLLOW, "You said a couple of months ahead. Is three weeks too late?"],
  [FOLLOW, "My passport expires in four months. Is that a problem?"],
  [FOLLOW, "What did you tell me about booking flights?"],
  [FOLLOW, "I'm only travelling inside my own country. Do I still need the passport?"],
  [FOLLOW, "So when exactly should I book, and what about the passport? Sum it up."],
  [OFF, "Can you help me write a cover letter for a job?"],
  [OFF, "What's a good recipe for banana bread?"],
  [OFF, "Who won the World Cup in 2018?"],
  [OFF, "Fix this Python error for me: NameError: name 'x' is not defined."],
];

const cases: Case[] = rows.map(([kind, input], i) => ({ id: `travel-${i + 1}`, input, kind }));

/** "Travel tips", from the iOS and Android quickstarts: a system instruction, a chat already two turns long, and the traveller's next question. */
export const travel: Feature = {
  id: "sample_travel",
  name: "Answer a new traveller's question",
  system: "You are a Travel assistant. You will answer questions the user asks based on the information listed in Relevant Information. Do not hallucinate. Do not use the internet.",
  history: [
    { role: "user", text: "I have never traveled before. When should I book a flight?" },
    { role: "model", text: "You should book flights a couple of months ahead of time. It will be cheaper and more flexible for you." },
    { role: "user", text: "Do I need a passport?" },
    { role: "model", text: "If you are traveling outside your own country, make sure your passport is up-to-date and valid for more than 6 months during your travel." },
  ],
  cases,
  check: (answer) => (answer.trim() ? { ok: true } : { ok: false, reason: "The answer is empty." }),
  graded:
    "The reply stays a travel assistant's: it answers a travel question with sound general advice that agrees with what the chat already said, and it turns down or steers back a question that isn't about travel. It states no exact price, legal rule, timetable, phone number or other precise fact that it cannot know; saying that it can't know one is right.",
};
