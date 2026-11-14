import { label, type Case, type Feature } from "./types";

const PLAIN = "plain reviews";
const SARCASM = "sarcastic reviews";
const NEGATIVE_WORDS = "praise written in negative words";
const NOT_PRODUCT = "reviews that also judge the delivery or the service";
const TURN = "reviews that change direction halfway";
const SHORT = "very short reviews";

const rows: [string, string, string][] = [
  ["positive", PLAIN, "Does exactly what it says. The blades are sharp and it was half the price of the big brands."],
  ["positive", PLAIN, "Bought two for the patio. Sturdy, easy to put together, and they've survived a week of rain."],
  ["positive", PLAIN, "Lovely soft throw, washes well. My daughter has claimed it."],
  ["positive", PLAIN, "Arrived well packed. The colour matches the photos and the stitching is neat."],
  ["positive", PLAIN, "Third one I've bought from here. Never had a problem."],
  ["negative", PLAIN, "Stopped working after two days. Waste of money."],
  ["negative", PLAIN, "The handle snapped the first time I lifted it. Cheap plastic."],
  ["negative", PLAIN, "Nothing like the picture. Thin fabric and it smells of chemicals."],
  ["negative", PLAIN, "Leaks from the base. I've tried three washers and it still drips."],
  ["negative", PLAIN, "Wobbly, even after tightening every bolt. I wouldn't put anything heavy on it."],
  ["mixed", PLAIN, "Looks beautiful on the table, but the lid doesn't fit and steam escapes everywhere. I'm torn on whether to keep it."],
  ["mixed", PLAIN, "Great light, terrible battery. It lasts an evening at most. I can't decide if I'd buy it again."],
  ["mixed", PLAIN, "The cushions are comfortable but the covers faded badly in a month. Half happy, half annoyed."],
  ["mixed", PLAIN, "Cuts well and feels solid, yet the safety catch is so fiddly that I avoid using it. Mixed feelings."],
  ["mixed", PLAIN, "Good size and a nice finish; the drawers stick badly. Three stars: as much good as bad."],
  ["negative", SARCASM, "Oh brilliant, another kettle that turns itself off before the water boils. Just what I wanted."],
  ["negative", SARCASM, "If you enjoy assembling furniture with missing screws and holes that don't line up, this is the wardrobe for you."],
  ["positive", NEGATIVE_WORDS, "I expected it to be flimsy at this price. It isn't. Not a single complaint."],
  ["positive", NOT_PRODUCT, "The courier was two days late and the box was battered, but the mirror itself is perfect and exactly what I wanted."],
  ["negative", NOT_PRODUCT, "Five stars for the customer service, one star for the hedge trimmer, which is going back."],
  ["negative", TURN, "I wanted to love it. The design is clever. But it broke within a week and the replacement did too."],
  ["positive", TURN, "I was sceptical after the reviews here, but mine works fine and has done for six months. Happy."],
  ["positive", TURN, "Smaller than I pictured, which turned out to be a blessing: it fits the windowsill perfectly."],
  ["positive", TURN, "Would be perfect if it came in grey. As it is, still the best watering can I've owned."],
  ["negative", SHORT, "Returned it. Enough said."],
];

const heldBack: [string, string][] = [
  ["positive", "Took a while to arrive, but the bench is solid and looks great on the patio."],
  ["negative", "Lovely packaging and a nice note from the seller. Shame the teapot dribbles everywhere and the lid is chipped."],
  ["positive", "Honestly thought it would be a gimmick. Used it every day since."],
  ["negative", "It works, I suppose, if you don't mind the motor screaming and the smell of burning. Sending it back."],
  ["mixed", "The fabric is gorgeous and the fit is awful. I keep going back and forth on whether to return it."],
  ["positive", "My only gripe is that I didn't buy two. Brilliant little heater."],
  ["negative", "Great idea, poor product. The hinge failed in a fortnight."],
  ["positive", "Instructions were useless, but once it's up it's sturdy, level and exactly the right size. Very pleased."],
  ["mixed", "Half the tiles are perfect and half arrived a different shade. Not sure yet whether I'll keep them."],
  ["negative", "Would not buy again."],
];

export const mood: Feature = {
  id: "review_mood",
  name: "Read a review's mood",
  system:
    "You read one product review from Larkfield, an online home and garden shop, and say how the buyer feels about the product overall. positive: happy with the product. negative: unhappy with the product. mixed: clear praise and a clear complaint about the product, with neither winning.",
  ...label(["positive", "negative", "mixed"]),
  cases: rows.map(([expect, kind, input], i): Case => ({ id: `mood-${i + 1}`, input, expect, kind })),
  heldBack: heldBack.map(([expect, input], i): Case => ({ id: `mood-held-${i + 1}`, input, expect, kind: "held back" })),
};
