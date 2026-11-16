import { parse, type Case, type Feature } from "../features/types";

const PLAIN = "a number and a kind of character";
const WORDS = "the number written as a word";
const ONE = "one character or many";
const NARROW = "a narrow kind of character";

// The first is the sample's own prompt, word for word. The rest are ours.
const rows: [string, number, string][] = [
  [PLAIN, 3, "Generate 3 animal-based characters for a card game."],
  [PLAIN, 4, "Generate 4 animal-based characters for a board game."],
  [PLAIN, 2, "Generate 2 robot characters for a card game."],
  [PLAIN, 5, "Generate 5 bird-based characters for a card game."],
  [PLAIN, 3, "Generate 3 sea-creature characters for a children's card game."],
  [PLAIN, 4, "Generate 4 insect-based characters for a strategy game."],
  [PLAIN, 3, "Generate 3 dragon characters for a fantasy card game."],
  [PLAIN, 2, "Generate 2 dinosaur-based characters for a card game."],
  [WORDS, 3, "Generate three animal-based characters for a card game."],
  [WORDS, 5, "Generate five forest-animal characters for a card game."],
  [WORDS, 2, "Generate two cat characters for a card game."],
  [WORDS, 4, "Generate four farm-animal characters for a card game."],
  [WORDS, 6, "Generate six animal-based characters for a card game."],
  [ONE, 1, "Generate 1 animal-based character for a card game."],
  [ONE, 1, "Generate a single wolf character for a card game."],
  [ONE, 8, "Generate 8 animal-based characters for a card game."],
  [ONE, 10, "Generate 10 animal-based characters for a card game."],
  [ONE, 7, "Generate 7 bird-based characters for a card game."],
  [NARROW, 3, "Generate 3 characters for a card game, each a different kind of owl."],
  [NARROW, 3, "Generate 3 reptile characters for a card game, none of them a snake."],
  [NARROW, 4, "Generate 4 animal-based characters for a card game, all of them under 5 years old."],
  [NARROW, 2, "Generate 2 animal-based characters for a card game, both wearing hats."],
  [NARROW, 3, "Generate 3 nocturnal-animal characters for a card game."],
  [NARROW, 3, "Generate 3 Arctic-animal characters for a card game."],
  [NARROW, 5, "Generate 5 animal-based characters for a card game, each a different species."],
];

const cases: Case[] = rows.map(([kind, expect, input], i) => ({ id: `characters-${i + 1}`, input, expect, kind }));

/** Structured output with a schema, from the web quickstart: a list of characters as JSON. */
export const characters: Feature = {
  id: "sample_characters",
  name: "Make up characters as JSON",
  system: "",
  // The sample's schema: every field required except the accessory.
  schema: {
    type: "object",
    properties: {
      characters: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, accessory: { type: "string" }, age: { type: "number" }, species: { type: "string" } },
          required: ["name", "age", "species"],
        },
      },
    },
    required: ["characters"],
  },
  cases,
  check(answer, c) {
    const list = parse(answer)?.characters;
    if (!Array.isArray(list)) return { ok: false, reason: "The answer isn't in the shape asked for." };
    if (list.length !== c.expect) return { ok: false, reason: `Made ${list.length} characters; ${c.expect} were asked for.` };
    const whole = list.every((x) => x && typeof x.name === "string" && x.name.trim() && typeof x.age === "number" && typeof x.species === "string" && x.species.trim());
    return whole ? { ok: true } : { ok: false, reason: "A character lacks its name, age or species." };
  },
  graded: "Every character is of the kind the request asks for, and keeps any other condition the request sets (an age, an accessory, different species).",
};
