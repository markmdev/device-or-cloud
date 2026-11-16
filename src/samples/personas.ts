import type { Case, Feature } from "../features/types";

const FACTS = "questions with one right answer";
const HOW = "how-to questions";
const SMALL = "small talk";

// Every persona in the sample takes whatever the user types, so these inputs are ours. A question with one right
// answer names the words a correct reply has to hold.
const everyday: [string, string, string[]?][] = [
  [FACTS, "What is the capital of Australia?", ["canberra"]],
  [FACTS, "How many days are there in a leap year?", ["366", "three hundred (and )?sixty[- ]six"]],
  [FACTS, "What is 12 times 12?", ["144", "one hundred (and )?forty[- ]four"]],
  [FACTS, "Which planet is closest to the sun?", ["mercury"]],
  [FACTS, "What is the chemical symbol for gold?", ["au"]],
  [FACTS, "How many legs does a spider have?", ["eight", "8"]],
  [FACTS, "What is the largest ocean on Earth?", ["pacific"]],
  [FACTS, "Who wrote Romeo and Juliet?", ["shakespeare"]],
  [FACTS, "What is the freezing point of water in degrees Celsius?", ["0", "zero"]],
  [FACTS, "How many minutes are there in two hours?", ["120", "one hundred (and )?twenty"]],
  [FACTS, "What colour do you get when you mix blue and yellow?", ["green"]],
  [FACTS, "What is the square root of 81?", ["9", "nine"]],
  [HOW, "How do I boil an egg?"],
  [HOW, "How do I change a flat tyre on a bicycle?"],
  [HOW, "How can I remember people's names better?"],
  [HOW, "What's a good way to start learning the guitar?"],
  [HOW, "How do I get a red wine stain out of a carpet?"],
  [HOW, "How do I write a polite email asking for a day off?"],
  [HOW, "How should I water a cactus?"],
  [HOW, "How do I fall asleep faster?"],
  [SMALL, "Hello! How are you today?"],
  [SMALL, "I just got a new puppy!"],
  [SMALL, "It's raining again and I'm bored."],
  [SMALL, "Tell me something interesting."],
  [SMALL, "Thanks, that was helpful. Goodbye!"],
  // Ten more of ours, written on 16 November before any model answered them.
  [FACTS, "How many sides does a hexagon have?", ["six", "6"]],
  [FACTS, "What is the boiling point of water in degrees Celsius at sea level?", ["100", "one hundred"]],
  [FACTS, "Which is the longest river in Africa?", ["nile"]],
  [FACTS, "How many hours are there in three days?", ["72", "seventy[- ]two"]],
  [HOW, "How do I iron a shirt?"],
  [HOW, "How do I make a cup of tea?"],
  [HOW, "How can I save money on my food shopping?"],
  [SMALL, "Good morning! What a lovely day."],
  [SMALL, "I can't decide what to have for dinner."],
  [SMALL, "My team lost the match last night."],
];

const said = (answer: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(answer));

function persona(id: string, name: string, system: string, graded: string, must?: (answer: string) => string | undefined): Feature {
  return {
    id: `sample_${id}`,
    name,
    system,
    cases: everyday.map(([kind, input, expect], i): Case => ({ id: `${id}-${i + 1}`, input, expect: expect?.join(" or "), kind })),
    check(answer, c) {
      if (!answer.trim()) return { ok: false, reason: "The answer is empty." };
      const right = everyday.find(([, input]) => input === c.input)?.[2];
      if (right && !said(answer, right)) return { ok: false, reason: `The reply doesn't give the right answer, ${right[0]}.` };
      const broken = must?.(answer);
      return broken ? { ok: false, reason: broken } : { ok: true };
    },
    graded,
  };
}

/** The chat personas of the web quickstart's React app. Each is a system instruction; the user types anything. */
export const pirate = persona(
  "pirate",
  "Chat as a pirate captain",
  "You are a salty pirate captain. All of your responses must be in the style of a classic pirate, using pirate slang and a hearty, adventurous tone. Refer to the user as 'matey'.",
  "The reply is in the style of a classic pirate, with pirate slang and a hearty, adventurous tone, and it answers what the user said.",
  (answer) => (/\bmatey\b/i.test(answer) ? undefined : "The reply doesn't call the user 'matey'."),
);

export const shakespeare = persona(
  "shakespeare",
  "Chat as a Shakespearean poet",
  "You are a Shakespearean poet. All of your responses must be in the style of William Shakespeare, using iambic pentameter where possible, and rich, poetic language. Address the user with 'Hark, gentle user' or similar.",
  "The reply is in the style of William Shakespeare, in rich, poetic language, it addresses the user with 'Hark, gentle user' or something like it, and it answers what the user said.",
);

export const teenager = persona(
  "teenager",
  "Chat as a sarcastic teenager",
  "You are a stereotypical sarcastic teenager. Your responses should be brief, slightly annoyed, and use modern slang. You are reluctant to be helpful but will provide the correct answer, albeit with a sigh. Start your responses with 'Ugh, fine.' or something similar.",
  "The reply is brief, sounds like a slightly annoyed, sarcastic teenager using modern slang, starts with 'Ugh, fine.' or something like it, and still gives a correct, usable answer.",
);

const BASICS = "language basics";
const PRACTICE = "best-practice questions";
const BUGS = "a bug to explain";
const VAGUE = "vague or broad questions";

const dev: [string, string][] = [
  [BASICS, "What is the difference between let and const in JavaScript?"],
  [BASICS, "What does a Python list comprehension do?"],
  [BASICS, "What is a null pointer?"],
  [BASICS, "What's the difference between == and === in JavaScript?"],
  [BASICS, "What is recursion?"],
  [BASICS, "What is the difference between a stack and a queue?"],
  [BASICS, "What does async/await do?"],
  [PRACTICE, "How should I store passwords in a database?"],
  [PRACTICE, "When should I write a unit test and when an integration test?"],
  [PRACTICE, "How do I name variables well?"],
  [PRACTICE, "Should I commit my .env file to git?"],
  [PRACTICE, "How do I avoid SQL injection?"],
  [PRACTICE, "What makes a good commit message?"],
  [PRACTICE, "How big should a function be?"],
  [BUGS, "Why does 0.1 + 0.2 not equal 0.3 in JavaScript?"],
  [BUGS, "My Python function with a default argument of [] keeps its values between calls. Why?"],
  [BUGS, "Why do I get 'undefined is not a function' when I pass a method as a callback?"],
  [BUGS, "My for loop over an array skips items when I remove them inside the loop. Why?"],
  [BUGS, "Why is my React component rendering twice in development?"],
  [BUGS, "I get a merge conflict in git. What is it and how do I resolve it?"],
  [VAGUE, "How do I become a better programmer?"],
  [VAGUE, "Which programming language should I learn first?"],
  [VAGUE, "My code is slow. What should I do?"],
  [VAGUE, "Is it OK to copy code from the internet?"],
  [VAGUE, "How do I start contributing to open source?"],
  // Ten more of ours, written on 16 November before any model answered them.
  [BASICS, "What is the difference between a class and an object?"],
  [BASICS, "What is a hash map?"],
  [BASICS, "What does immutable mean?"],
  [PRACTICE, "How should I handle errors in an API?"],
  [PRACTICE, "When should I add a comment to my code?"],
  [PRACTICE, "How do I review someone else's pull request well?"],
  [BUGS, "Why does my JavaScript sort put 10 before 9 when I sort numbers?"],
  [BUGS, "My Python script says 'IndentationError: unexpected indent'. What does it mean?"],
  [VAGUE, "How do I learn a new codebase quickly?"],
  [VAGUE, "Should I use tabs or spaces?"],
];

export const seniorDev: Feature = {
  id: "sample_senior_dev",
  name: "Chat as a helpful senior developer",
  system:
    "You are a helpful and patient senior software developer. Your responses should be clear, well-structured, and provide best-practice advice. When explaining concepts, use code examples where appropriate and break down complex topics into smaller, understandable parts.",
  cases: dev.map(([kind, input], i) => ({ id: `senior_dev-${i + 1}`, input, kind })),
  check: (answer) => (answer.trim() ? { ok: true } : { ok: false, reason: "The answer is empty." }),
  graded: "The reply is correct, clear and well structured, gives best-practice advice, breaks a complex topic into smaller parts, and uses a code example where one helps.",
};
