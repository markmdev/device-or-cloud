import type { Case, Feature } from "../features/types";

const GENRES = ["drama", "comedy", "documentary"] as const;

const PLAIN = "plain descriptions";
const MIXED = "descriptions with words from another genre";
const SHORT = "one-line descriptions";

// The first is the sample's own prompt, word for word. The rest are ours.
const rows: [(typeof GENRES)[number], string, string][] = [
  ["documentary", PLAIN, "The film aims to educate and inform viewers about real-life subjects, events, or people. It offers a factual record of a particular topic by combining interviews, historical footage, and narration."],
  ["comedy", PLAIN, "Two hapless brothers inherit a failing ice cream van and try to win a seaside town's summer contest, with one disaster after another played for laughs."],
  ["drama", PLAIN, "After her husband's death, a farmer fights to keep the family land while her grown children pull in different directions. A slow, serious story about grief and duty."],
  ["documentary", PLAIN, "Filmed over four years, it follows three real fishing crews in the North Sea, with interviews and footage shot on the boats, and no actors."],
  ["comedy", PLAIN, "A wedding planner double-books the same castle for two rival families. Slapstick, mistaken identities and a runaway cake."],
  ["drama", PLAIN, "A young lawyer takes the case of a man she believes is innocent and watches it cost her career and her marriage."],
  ["documentary", PLAIN, "Using archive film and new interviews with the engineers, it tells how the Channel Tunnel was actually built."],
  ["comedy", PLAIN, "A retired spy cannot stop treating the neighbourhood watch like a secret mission. Light, silly, and full of running gags."],
  ["drama", PLAIN, "Two estranged sisters meet at their childhood home to care for their dying mother and face what drove them apart."],
  ["documentary", PLAIN, "A factual portrait of a real orchestra during its hundredth season, narrated by its conductor, with rehearsal footage and musicians' own accounts."],
  ["comedy", MIXED, "A mockumentary: a fake film crew follows a hopeless village football team. Everything is scripted and played for laughs."],
  ["documentary", MIXED, "A film about the history of stand-up comedy, told through interviews with real comedians and old club recordings."],
  ["drama", MIXED, "Based on a true story, with actors playing every part: a miner's family through the long strike of 1984. Heavy and moving."],
  ["documentary", MIXED, "The dramatic true story of a mountain rescue, told by the survivors themselves in interviews, with footage from the rescuers' helmet cameras."],
  ["comedy", MIXED, "A scripted farce about a documentary maker who keeps ruining the nature film he is trying to shoot."],
  ["drama", MIXED, "A stand-up comedian's life falls apart off stage. There are jokes in his act, but the film is a sad, serious study of loneliness."],
  ["documentary", MIXED, "Funny in places, but all real: a year inside a real school's kitchen, with the cooks talking to camera."],
  ["comedy", MIXED, "A fictional town council declares war on pigeons. The film pretends to be a serious news report, and every scene is a joke."],
  ["drama", MIXED, "Actors recreate the last days of a real polar expedition. No interviews, no narrator, only the men and the ice."],
  ["documentary", SHORT, "Real beekeepers explain, on camera, why their hives are dying."],
  ["comedy", SHORT, "A dog inherits a fortune and the relatives try to charm him. Very silly."],
  ["drama", SHORT, "A father and son, a long drive, and ten years of silence to break."],
  ["documentary", SHORT, "Archive footage and interviews tell the true history of the bicycle."],
  ["comedy", SHORT, "Three grandmothers rob a bank, badly, and hilariously."],
  ["drama", SHORT, "A nurse on a night shift must choose which of two patients to save."],
];

const cases: Case[] = rows.map(([expect, kind, input], i) => ({ id: `genre-${i + 1}`, input, expect, kind }));

/** Structured output with enum values, from the web quickstart: the film's genre as one of three words. */
export const genre: Feature = {
  id: "sample_genre",
  name: "Sort a film into a genre",
  system: "",
  schema: { type: "string", enum: GENRES },
  cases,
  check(answer, c) {
    const got = answer.trim().replace(/^"|"$/g, "");
    if (!(GENRES as readonly string[]).includes(got)) return { ok: false, reason: "The answer isn't one of the three genres." };
    return got === c.expect ? { ok: true } : { ok: false, reason: `Answered "${got}"; the right answer is "${c.expect}".` };
  },
};
