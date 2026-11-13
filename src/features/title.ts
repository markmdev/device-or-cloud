import { fail, OK, type Case, type Feature } from "./types";

const PLAIN = "plain notes";
const SHOUTY = "notes in capitals with sales talk";
const LONG = "notes with more detail than fits";
const QUANTITY = "notes for a set of several";

/** Each group lists the ways one detail can be written; a title must use one from every group. */
type Row = [kind: string, notes: string, keep: string[][], example: string];

const rows: Row[] = [
  [PLAIN, "hand made mug, stoneware, speckled blue glaze, holds about 350ml", [["mug"], ["stoneware"], ["blue"], ["350"]], "Handmade stoneware mug, speckled blue, 350 ml"],
  [PLAIN, "kids raincoat age 5-6 yellow with reflective strips, fleece lined", [["raincoat"], ["5-6", "5 to 6", "5–6"], ["yellow"]], "Kids' yellow raincoat, age 5-6, fleece lined"],
  [PLAIN, "wool blanket 130 x 180 cm, grey herringbone, made in Wales", [["blanket"], ["wool"], ["130"], ["180"], ["grey", "gray"]], "Grey herringbone wool blanket, 130 x 180 cm"],
  [PLAIN, "watering can 9 litre galvanised steel with brass rose", [["watering can"], ["9"], ["steel"]], "Galvanised steel watering can, 9 litre, brass rose"],
  [PLAIN, "linen tablecloth, natural colour, 150cm round", [["tablecloth"], ["linen"], ["150"], ["natural"]], "Natural linen tablecloth, 150 cm round"],
  [PLAIN, "oak chopping board 40 x 28 cm with juice groove", [["chopping board", "cutting board"], ["oak"], ["40"], ["28"]], "Oak chopping board, 40 x 28 cm, juice groove"],
  [PLAIN, "ceramic plant pot, white, 20cm, with drainage hole and saucer", [["pot", "planter"], ["ceramic"], ["white"], ["20"]], "White ceramic plant pot, 20 cm, with saucer"],
  [PLAIN, "garden kneeler, foam, green, 45 x 20 cm", [["kneeler"], ["foam"], ["green"], ["45"], ["20"]], "Green foam garden kneeler, 45 x 20 cm"],
  [PLAIN, "cotton apron, navy stripe, adjustable neck strap, one size", [["apron"], ["cotton"], ["navy"]], "Navy stripe cotton apron, adjustable strap"],
  [SHOUTY, "BEST EVER!!! LED DESK LAMP - black - 3 brightness levels - AMAZING VALUE", [["lamp"], ["black"], ["led"]], "Black LED desk lamp, 3 brightness levels"],
  [SHOUTY, "*** BARGAIN *** GARDEN HOSE 30 METRES GREEN WITH SPRAY GUN!!! DON'T MISS OUT", [["hose"], ["30"], ["green"]], "Green garden hose, 30 m, with spray gun"],
  [SHOUTY, "STUNNING VELVET CUSHION!!! mustard yellow, 45cm square, feather filled, WOW", [["cushion"], ["velvet"], ["mustard", "yellow"], ["45"]], "Mustard yellow velvet cushion, 45 cm, feather filled"],
  [SHOUTY, "UNBEATABLE PRICE bamboo bath mat 60x40cm, natural finish, FREE GIFT", [["bath mat"], ["bamboo"], ["60"], ["40"]], "Bamboo bath mat, 60 x 40 cm, natural finish"],
  [SHOUTY, "MUST HAVE!!! cast iron casserole dish 24cm RED enamel, oven safe", [["casserole"], ["cast iron", "cast-iron"], ["24"], ["red"]], "Red enamel cast iron casserole dish, 24 cm"],
  [SHOUTY, "SALE SALE SALE doormat coir 60 x 90 cm plain natural, BEST SELLER", [["doormat", "door mat"], ["coir"], ["60"], ["90"]], "Plain coir doormat, 60 x 90 cm"],
  [LONG, "USB-C cable 2 metres long braided nylon supports 100W fast charging and data, comes in black, 18 month warranty, works with laptops, tablets and phones", [["cable"], ["usb-c", "usb c"], ["2 m", "2m", "2 metre", "2-metre"], ["black"], ["nylon"]], "Black braided nylon USB-C cable, 2 m, 100 W"],
  [LONG, "bird feeder, hanging, clear plastic tube with green metal lid and base, 4 feeding ports, holds 1 kg of seed, 38 cm tall, easy to clean, squirrel resistant", [["bird feeder"], ["green"], ["38"]], "Hanging bird feeder, green metal and clear tube, 38 cm"],
  [LONG, "floor lamp with a brass finish steel stem, 150 cm tall, cream fabric shade, foot switch, takes an E27 bulb which is not included, 2 m cord, suits living rooms and bedrooms", [["floor lamp"], ["brass"], ["150"], ["cream"]], "Brass finish steel floor lamp, 150 cm, cream shade"],
  [LONG, "garden trowel with ash wood handle and stainless steel blade, 30 cm long, leather hanging loop, rust resistant, 10 year guarantee, gift boxed", [["trowel"], ["ash"], ["steel"], ["30"]], "Stainless steel garden trowel, ash handle, 30 cm"],
  [LONG, "storage basket woven from seagrass, natural colour, 35 cm wide and 30 cm high, two handles, folds flat, good for toys, blankets or laundry", [["basket"], ["seagrass"], ["35"], ["30"], ["natural"]], "Natural seagrass storage basket, 35 x 30 cm"],
  [QUANTITY, "set of 6 wine glasses, clear glass, 350ml each, dishwasher safe", [["glasses"], ["6", "six"], ["350"]], "Set of 6 clear wine glasses, 350 ml"],
  [QUANTITY, "pack of 20 beeswax tea lights, natural yellow, 4 hour burn", [["tea lights", "tealights"], ["20", "twenty"], ["beeswax"]], "Pack of 20 beeswax tea lights, natural yellow"],
  [QUANTITY, "4 cork coasters, round, 10cm, plain", [["coasters"], ["4", "four"], ["cork"], ["10"]], "Set of 4 round cork coasters, 10 cm"],
  [QUANTITY, "three terracotta herb pots 12cm on a wooden tray", [["pots"], ["3", "three"], ["terracotta"], ["12"]], "Set of 3 terracotta herb pots, 12 cm, wooden tray"],
  [QUANTITY, "pair of oven gloves, quilted cotton, grey, 30cm long", [["oven gloves", "oven mitts"], ["pair", "2", "two"], ["cotton"], ["grey", "gray"]], "Pair of grey quilted cotton oven gloves, 30 cm"],
];

const SALES_TALK = ["best", "amazing", "bargain", "stunning", "wow", "unbeatable", "must have", "must-have", "don't miss", "free gift", "sale"];

type Expect = { keep: string[][]; example: string };

export const title: Feature = {
  id: "product_title",
  name: "Rewrite a product title",
  system:
    "You write the title of a product listing for Larkfield, an online home and garden shop, from the seller's notes. At most 60 characters. Start with a capital letter. Keep the size, colour, material and quantity the notes give. No word written all in capitals, no exclamation marks and no sales talk. Reply with the title only.",
  graded: "Nothing in the title is invented or changed from the seller's notes. A title is short, so leaving details out is fine.",
  check(answer, c) {
    const text = answer.trim();
    const lower = text.toLowerCase();
    if (text.length > 60) return fail(`${text.length} characters; the limit is 60.`);
    if (!/^[A-Z0-9]/.test(text)) return fail("Doesn't start with a capital letter.");
    if (text.includes("!")) return fail("Has an exclamation mark.");
    const shouted = text.split(/[^A-Za-z-]+/).find((w) => w.length > 3 && w === w.toUpperCase() && !/^USB/.test(w));
    if (shouted) return fail(`"${shouted}" is written all in capitals.`);
    const talk = SALES_TALK.find((w) => new RegExp(`\\b${w}\\b`).test(lower));
    if (talk) return fail(`Has sales talk: "${talk}".`);
    const missing = (c.expect as Expect).keep.find((ways) => !ways.some((w) => lower.includes(w)));
    if (missing) return fail(`Leaves out "${missing[0]}".`);
    return OK;
  },
  cases: rows.map(([kind, input, keep, example], i): Case => ({ id: `title-${i + 1}`, input, expect: { keep, example }, kind })),
};
