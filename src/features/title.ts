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
  [PLAIN, "butter dish, white porcelain, with beech wood lid, fits a 250g block", [["butter dish"], ["porcelain"], ["white"], ["250"]], "White porcelain butter dish, beech lid, 250 g"],
  [PLAIN, "garden fork, stainless steel head, ash handle, 95 cm long", [["fork"], ["steel"], ["95"]], "Stainless steel garden fork, ash handle, 95 cm"],
  [PLAIN, "shower curtain polyester 180 x 200 cm pale grey, with 12 hooks", [["shower curtain"], ["polyester"], ["180"], ["200"], ["grey", "gray"]], "Pale grey polyester shower curtain, 180 x 200 cm"],
  [PLAIN, "wall clock 30cm oak frame white face silent movement", [["clock"], ["30"], ["oak"]], "Oak wall clock, 30 cm, white face, silent"],
  [PLAIN, "bamboo cutlery tray, expandable, 5 to 7 compartments, 33 cm wide", [["cutlery tray"], ["bamboo"], ["33"]], "Expandable bamboo cutlery tray, 33 cm wide"],
  [PLAIN, "picnic blanket 150 x 200 cm, red tartan fleece, waterproof backing", [["blanket", "rug"], ["150"], ["200"], ["red"], ["fleece"]], "Red tartan fleece picnic blanket, 150 x 200 cm"],
  [PLAIN, "soap dispenser, amber glass, 500ml, black pump", [["dispenser"], ["glass"], ["amber"], ["500"]], "Amber glass soap dispenser, 500 ml, black pump"],
  [PLAIN, "kids wellies size 10 navy with red soles natural rubber", [["wellies", "wellington", "boots"], ["10"], ["navy"], ["rubber"]], "Kids' navy rubber wellies, size 10, red soles"],
  [PLAIN, "draught excluder, 90cm, grey wool felt, weighted", [["draught excluder", "draft excluder"], ["90"], ["grey", "gray"], ["wool", "felt"]], "Grey wool felt draught excluder, 90 cm, weighted"],
  [SHOUTY, "HOT DEAL!!! STAINLESS STEEL KETTLE 1.7 LITRE - matt black - RAPID BOIL - WOW", [["kettle"], ["steel"], ["1.7"], ["black"]], "Matt black stainless steel kettle, 1.7 litre"],
  [SHOUTY, "*** BEST BUY *** picture frame A4 solid oak, glass front!!! LIMITED STOCK", [["frame"], ["a4"], ["oak"]], "Solid oak A4 picture frame, glass front"],
  [SHOUTY, "AMAZING!!! FLEECE THROW 130x170cm TEAL - SUPER SOFT - BUY NOW", [["throw", "blanket"], ["fleece"], ["130"], ["170"], ["teal"]], "Teal fleece throw, 130 x 170 cm"],
  [SHOUTY, "UNMISSABLE!!! ceramic utensil jar, cream, 15cm tall - TOP RATED", [["jar", "pot", "holder"], ["ceramic"], ["cream"], ["15"]], "Cream ceramic utensil jar, 15 cm tall"],
  [SHOUTY, "BIG BARGAIN garden parasol 2.5m GREEN crank handle, steel pole!!!", [["parasol"], ["2.5"], ["green"]], "Green garden parasol, 2.5 m, crank handle, steel pole"],
  [SHOUTY, "WOW WOW WOW jute rug 120 x 180 cm natural, flat weave, UNBEATABLE VALUE", [["rug"], ["jute"], ["120"], ["180"]], "Natural jute rug, 120 x 180 cm, flat weave"],
  [LONG, "kitchen scales, digital, stainless steel platform, weighs up to 5 kg in 1 g steps, tare button, backlit display, takes 2 AAA batteries which are included, slim enough for a drawer, 5 year guarantee", [["scale"], ["steel"], ["5 kg", "5kg"]], "Digital kitchen scales, stainless steel, 5 kg"],
  [LONG, "laundry basket made of woven willow with a hinged lid and a removable cotton liner, 60 cm tall and 45 cm across, natural colour, rope handles, holds about 80 litres", [["basket"], ["willow"], ["60"]], "Willow laundry basket with lid and liner, 60 cm tall"],
  [LONG, "outdoor wall lantern in black powder coated aluminium with clear glass panels, 35 cm high, takes an E27 bulb which is not included, rated IP44 for rain, fittings supplied", [["lantern", "light"], ["black"], ["aluminium", "aluminum"], ["35"]], "Black aluminium outdoor wall lantern, 35 cm"],
  [LONG, "pruning saw with a 25 cm folding carbon steel blade, beech handle, locks open and closed, cuts on the pull stroke, comes with a canvas pouch, replacement blades available", [["saw"], ["25"], ["steel"]], "Folding pruning saw, 25 cm carbon steel blade"],
  [LONG, "bath mat in cotton terry, 50 x 80 cm, sage green, 1200 gsm so very absorbent, non slip backing, machine washable at 40 degrees, made in Portugal, matching towels sold separately", [["bath mat"], ["cotton"], ["50"], ["80"], ["green"]], "Sage green cotton bath mat, 50 x 80 cm"],
  [QUANTITY, "set of 4 linen napkins, charcoal, 45cm square", [["napkins"], ["4", "four"], ["linen"], ["charcoal"], ["45"]], "Set of 4 charcoal linen napkins, 45 cm"],
  [QUANTITY, "pack of 10 bamboo plant labels with pencil, 15cm", [["labels"], ["10", "ten"], ["bamboo"]], "Pack of 10 bamboo plant labels, 15 cm, with pencil"],
  [QUANTITY, "two seagrass placemats round 38cm", [["placemats", "place mats"], ["2", "two", "pair"], ["seagrass"], ["38"]], "Pair of round seagrass placemats, 38 cm"],
  [QUANTITY, "set of three enamel mugs, white with blue rim, 350ml", [["mugs"], ["3", "three"], ["enamel"], ["350"]], "Set of 3 white enamel mugs, blue rim, 350 ml"],
  [QUANTITY, "6 egg cups stoneware assorted pastel colours", [["egg cups", "eggcups"], ["6", "six"], ["stoneware"]], "Set of 6 pastel stoneware egg cups"],
];

const heldBack: [notes: string, keep: string[][], example: string][] = [
  ["door wedge, solid beech, 12 cm long, natural finish", [["wedge", "door stop", "doorstop"], ["beech"], ["12"]], "Solid beech door wedge, 12 cm, natural finish"],
  ["GORGEOUS!!! throw pillow cover linen sage green 50x50cm zip closure - BEST PRICE", [["cover"], ["linen"], ["green"], ["50"]], "Sage green linen cushion cover, 50 x 50 cm, zip"],
  ["set of 3 nesting storage tins, cream enamel, largest 18cm", [["tins"], ["3", "three"], ["cream"], ["18"]], "Set of 3 cream enamel nesting storage tins, 18 cm"],
  ["garden twine 100 m jute, green, on a wooden spool", [["twine"], ["100"], ["jute"], ["green"]], "Green jute garden twine, 100 m, wooden spool"],
  ["welcome mat rubber backed 45 x 75 cm charcoal grey, hose clean, hard wearing, suits porches and back doors, will not curl at the edges", [["mat"], ["45"], ["75"], ["grey", "gray"]], "Charcoal grey rubber backed welcome mat, 45 x 75 cm"],
  ["pair of bookends, cast iron, black, 15cm high", [["bookends"], ["pair", "2", "two"], ["cast iron", "cast-iron"], ["black"]], "Pair of black cast iron bookends, 15 cm"],
  ["bread bin bamboo lid white steel body 33cm wide", [["bread bin"], ["bamboo"], ["white"], ["33"]], "White steel bread bin with bamboo lid, 33 cm"],
  ["AMAZING DEAL 12 wooden clothes pegs with spring, birch", [["pegs"], ["12", "twelve"], ["birch"]], "Pack of 12 birch wooden clothes pegs"],
  ["plant mister, amber glass, 300 ml, brass pump top", [["mister", "spray"], ["glass"], ["amber"], ["300"]], "Amber glass plant mister, 300 ml, brass pump"],
  ["tea towel, organic cotton, blue check, 50 x 70 cm, hanging loop, woven in Lancashire, gets softer with every wash, pack of two", [["tea towel"], ["cotton"], ["blue"], ["2", "two", "pair"]], "Pack of 2 blue check organic cotton tea towels"],
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
  heldBack: heldBack.map(([input, keep, example], i): Case => ({ id: `title-held-${i + 1}`, input, expect: { keep, example }, kind: "held back" })),
};
