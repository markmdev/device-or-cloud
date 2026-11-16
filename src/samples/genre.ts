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
  // Thirty more of ours, written on 16 November before any model answered them.
  ["comedy", PLAIN, "A shy accountant is mistaken for a famous chef and has to bluff his way through a week of television cookery, with every dish going wrong for laughs."],
  ["drama", PLAIN, "A teacher in a small mining town stands by a pupil accused of theft, and loses the trust of her neighbours. A quiet, serious film about loyalty."],
  ["documentary", PLAIN, "The filmmakers spent two years with real lighthouse keepers on the Scottish coast, recording their daily work and their own words to camera."],
  ["comedy", PLAIN, "Four flatmates try to hide a goat from their landlord. A light, daft film built on pratfalls and bad excuses."],
  ["drama", PLAIN, "A surgeon returns to work after a mistake that killed a patient, and has to face the family. Sombre and slow."],
  ["documentary", PLAIN, "Through interviews with former players and match footage from the time, it gives a factual account of the first women's football league."],
  ["comedy", PLAIN, "A boy band from the nineties reunites for one concert and nobody can remember the dance steps. Played entirely for laughs."],
  ["drama", PLAIN, "An ageing boxer and his estranged daughter spend one winter running a failing gym, in a serious story about regret."],
  ["documentary", PLAIN, "Scientists at a real Antarctic station explain their work on camera across one polar night, with narration and their own video diaries."],
  ["drama", PLAIN, "A widower learns that his late wife kept a second family, and travels to meet them. A sad, thoughtful film about forgiveness."],
  ["documentary", MIXED, "A real family of circus clowns, filmed at home and on tour for a year. Plenty of laughs, but nothing is scripted and they speak for themselves."],
  ["comedy", MIXED, "A spoof history programme: actors in bad wigs present invented facts about the Middle Ages with straight faces, and every one is a joke."],
  ["drama", MIXED, "Actors play a real family who lost their farm in the floods of 1953. It follows the facts closely, but it is acted throughout and deeply sad."],
  ["documentary", MIXED, "A funny, warm film in which real retired comedians look back at their careers in interviews, with clips from their old shows."],
  ["comedy", MIXED, "A made-up nature programme about pigeons in a car park, with a pompous narrator. It is scripted from start to finish and very silly."],
  ["drama", MIXED, "A clown at a children's hospital hides his own illness. There are gags in his act, but the film is a serious story about facing death."],
  ["documentary", MIXED, "The tragic true story of a shipwreck, told by the real survivors in interviews, with letters and photographs from the time."],
  ["comedy", MIXED, "A scripted send-up of true-crime films: a fake detective investigates who ate the office birthday cake, and it is all played for laughs."],
  ["drama", MIXED, "A serious, acted retelling of a real court case from 1920. There is no narrator and no interviews, only the actors in the courtroom."],
  ["documentary", MIXED, "Real wedding planners are filmed through one chaotic summer. It is often hilarious, and none of it is staged."],
  ["comedy", SHORT, "A vicar accidentally joins a biker gang. Very funny."],
  ["drama", SHORT, "A mother searches a war-torn city for her missing son."],
  ["documentary", SHORT, "Real firefighters describe, on camera, the night the mill burned."],
  ["comedy", SHORT, "Two rival ice cream sellers wage a ridiculous war of pranks."],
  ["drama", SHORT, "An old man decides whether to sell the house where his wife died."],
  ["documentary", SHORT, "Interviews and archive film tell the true story of the first weather forecast."],
  ["comedy", SHORT, "A cat becomes mayor by mistake, and chaos and jokes follow."],
  ["drama", SHORT, "Two brothers, one inheritance, and a quarrel that breaks the family."],
  ["documentary", SHORT, "Real midwives talk about their work, filmed over a year on one ward."],
  ["comedy", SHORT, "A hopeless magician keeps making the wrong things vanish. Silly fun."],
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
