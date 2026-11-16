import type { Case, Feature } from "../features/types";
import { malformed } from "./xml";

const SHAPES = "simple shapes";
const SCENES = "small scenes";
const STYLED = "prompts with a style or a colour scheme";
const WORDY = "prompts that ask for words in the picture";

// The sample takes whatever the user types, so these inputs are ours. The first is the starting prompt of the same
// app's image-generation sample.
const rows: [string, string][] = [
  [STYLED, "A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat.\nIt's munching on a green bamboo leaf. The design features bold,\nclean outlines, simple cel-shading, and a vibrant color palette.\nThe background must be white."],
  [SHAPES, "A red circle on a white background."],
  [SHAPES, "A blue square next to a yellow triangle."],
  [SHAPES, "Three green circles in a row, getting bigger from left to right."],
  [SHAPES, "A black five-pointed star in the middle of an orange background."],
  [SHAPES, "A chessboard, eight squares by eight."],
  [SHAPES, "A rainbow: seven curved bands on a pale blue sky."],
  [SCENES, "A small house with a red roof, a door and two windows, with a tree beside it."],
  [SCENES, "A sailing boat on a calm sea at sunset."],
  [SCENES, "A snowman with a carrot nose, a scarf and a top hat."],
  [SCENES, "A mountain range with a full moon and a few stars."],
  [SCENES, "A cup of coffee with steam rising from it, seen from the side."],
  [SCENES, "A bicycle leaning against a brick wall."],
  [SCENES, "A cactus in a terracotta pot on a windowsill."],
  [SCENES, "A lighthouse on a rock with waves around it."],
  [STYLED, "A flat-design icon of a rocket, in two colours only."],
  [STYLED, "A fox's face made only of triangles."],
  [STYLED, "A night city skyline in shades of purple, with lit windows."],
  [STYLED, "A line drawing of a cat, black lines on white, no fill."],
  [STYLED, "A retro sun with stripes, in orange, pink and dark blue."],
  [WORDY, "A road sign that says STOP."],
  [WORDY, "A birthday card front with a cake and the words Happy Birthday."],
  [WORDY, "A shop front with a striped awning and a sign that reads BAKERY."],
  [WORDY, "A badge with a star and the number 1 in the middle."],
  [WORDY, "A weather icon set: sun, cloud, rain and snow, each with its name under it."],
];

const cases: Case[] = rows.map(([kind, input], i) => ({ id: `svg-${i + 1}`, input, kind }));

/** The SVG generator, from the Android quickstart. Its own rules are ones code can check. */
export const svg: Feature = {
  id: "sample_svg",
  name: "Draw a picture as SVG code",
  system:
    'You are an expert at turning image prompts into SVG code. When given a prompt,\nuse your creativity to code a 800x600 SVG rendering of it.\nAlways add viewBox="0 0 800 600" to the root svg tag. Do\nnot import external assets, they won\'t work. Return ONLY the SVG code, nothing else,\nno commentary.',
  cases,
  rules: { pass: "Follows the sample's rules", unjudged: "Code checks the sample's rules. Nobody judged whether the picture shows what was asked." },
  check(answer) {
    // The sample app itself takes a ```xml fence off the reply before it draws it, and no other fence, so the check does too.
    const fence = /^```(\w*)/.exec(answer.trim())?.[1];
    if (fence !== undefined && fence !== "xml") return { ok: false, reason: `The reply is fenced as \`\`\`${fence}. The sample app takes off a \`\`\`xml fence and no other, so it can't draw this.` };
    const code = answer.trim().replace(/^```xml/, "").replace(/```$/, "").trim();
    if (!/^(<\?xml[^>]*\?>\s*)?<svg[\s>]/.test(code) || !code.endsWith("</svg>")) return { ok: false, reason: "The answer is not only SVG code." };
    if (!/^(<\?xml[^>]*\?>\s*)?<svg[^>]*\sviewBox="0 0 800 600"/.test(code)) return { ok: false, reason: 'The root svg tag has no viewBox="0 0 800 600".' };
    const outside = code.replace(/xmlns(:\w+)?="[^"]*"/g, "");
    if (/<image[\s>]|@import|https?:\/\//.test(outside)) return { ok: false, reason: "The code imports an outside asset." };
    const broken = malformed(code);
    return broken ? { ok: false, reason: `A browser can't draw the code: ${broken}.` } : { ok: true };
  },
};
