import type { Case, Feature } from "../features/types";

const PLAIN = "a student with an interest";
const PAST = "a student who names courses already taken";
const LIMITS = "a student with a limit: age, time, money, experience";
const OFF = "messages that aren't about choosing a course";

// The first is the sample's own prompt, word for word. The rest are ours.
const rows: [string, string][] = [
  [PAST, "I am interested in Performing Arts. I have taken Theater 1A."],
  [PLAIN, "I'd like to try something with music this summer."],
  [PLAIN, "I love drawing. What could I take?"],
  [PLAIN, "I want to learn to dance but I've never done it."],
  [PLAIN, "I'm interested in film and photography."],
  [PLAIN, "Is there anything for someone who likes singing?"],
  [PLAIN, "I'd like to work backstage, not on stage."],
  [PAST, "I finished Ceramics 1 and Ceramics 2. What's next?"],
  [PAST, "I've done Ballet 1A and Jazz Dance 1A. Should I go deeper or try something new?"],
  [PAST, "I took Choir last summer and didn't enjoy it. What else is there?"],
  [PAST, "I have taken Painting 1A and Drawing 1B and want something harder."],
  [PAST, "I've taken Theater 1A and Theater 1B. Is there a directing course?"],
  [LIMITS, "I'm 14. Which courses can I take?"],
  [LIMITS, "I only have Tuesday and Thursday evenings free."],
  [LIMITS, "I can't afford to buy an instrument. Can I still take a music course?"],
  [LIMITS, "I'm a complete beginner and a bit shy. What's a gentle start?"],
  [LIMITS, "I can only come for the first three weeks of summer."],
  [LIMITS, "I use a wheelchair. Which dance or theater courses would work for me?"],
  [LIMITS, "I want two courses but they mustn't clash. I like guitar and acting."],
  [OFF, "What's the weather going to be like this weekend?"],
  [OFF, "Can you help me with my math homework?"],
  [OFF, "Which is the best pizza place near the arts center?"],
  [OFF, "Write me an essay about Shakespeare."],
  [OFF, "How do I get a refund for a course I dropped last year?"],
  [PLAIN, "My friend and I want to take a course together. She likes painting and I like theater."],
];

const cases: Case[] = rows.map(([kind, input], i) => ({ id: `courses-${i + 1}`, input, kind }));

/** "Chatbot recommendations for courses", from the iOS and Android quickstarts. */
export const courses: Feature = {
  id: "sample_courses",
  name: "Help a student choose a summer arts course",
  system: "You are a chatbot for the county's performing and fine arts program. You help students decide what course they will take during the summer.",
  cases,
  check: (answer) => (answer.trim() ? { ok: true } : { ok: false, reason: "The answer is empty." }),
  graded:
    "The reply helps the student decide on a summer course in the performing and fine arts program: it fits the interests, past courses and limits the student gave, and it suggests a course or asks what it needs to know to suggest one. To a message that isn't about choosing a course, it says what it is for instead of doing the other task.",
};
