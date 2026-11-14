import { fields, plain, type Case, type Feature } from "./types";

const PLAIN = "plain emails";
const TWO = "emails with an old and a new address";
const SPREAD = "emails where the address is spread through the text";
const SIGNATURE = "emails with another address in the signature";
const OTHER_PERSON = "emails sending the order to someone else";
const NONE = "emails that give no address";

type Row = [kind: string, name: string, street: string, city: string, postcode: string, email: string];

const rows: Row[] = [
  [PLAIN, "Hannah Whitcombe", "14 Mill Road", "Leeds", "LS6 4QT", "Hi, please deliver my order to:\nHannah Whitcombe\n14 Mill Road\nLeeds\nLS6 4QT\nThanks!"],
  [PLAIN, "Daniel Okafor", "Flat 3, 27 Harbour Street", "Bristol", "BS1 5TX", "Hello Larkfield, my delivery address is Daniel Okafor, Flat 3, 27 Harbour Street, Bristol BS1 5TX."],
  [PLAIN, "Priya Raman", "8 Orchard Close", "Reading", "RG4 7HB", "Order #71520. Deliver to Priya Raman, 8 Orchard Close, Reading, RG4 7HB please."],
  [PLAIN, "Tom Ellery", "The Old Bakery, Church Lane", "Ludlow", "SY8 1BN", "Please send it to Tom Ellery at The Old Bakery, Church Lane, Ludlow, SY8 1BN. There's no house number."],
  [PLAIN, "Grace Liang", "61 Station Parade", "Harrogate", "HG1 1TT", "delivery address for my order: grace liang, 61 station parade, harrogate, hg1 1tt"],
  [PLAIN, "Marcus Bell", "Unit 5, Tannery Yard", "Kendal", "LA9 4RE", "Hi team. It's a business address: Marcus Bell, Unit 5, Tannery Yard, Kendal LA9 4RE. Someone is in from 9 to 5."],
  [PLAIN, "Aisha Rahman", "102 Kingsway", "Swansea", "SA1 5JE", "Name: Aisha Rahman\nAddress: 102 Kingsway\nTown: Swansea\nPostcode: SA1 5JE\nPhone: on my account"],
  [PLAIN, "Oliver Stroud", "3 Beech Avenue", "Norwich", "NR2 3PL", "Could you post the lamp to Oliver Stroud, 3 Beech Avenue, Norwich NR2 3PL? Leave it in the porch if I'm out."],
  [TWO, "Rosa Delgado", "19 Canal Walk", "Manchester", "M4 6DE", "I've moved since I ordered. Please don't use 4 Poplar Court, Salford M5 3WQ any more. The new address is Rosa Delgado, 19 Canal Walk, Manchester M4 6DE."],
  [TWO, "Ian McAllister", "7 Lochside Terrace", "Stirling", "FK8 2QR", "My account still shows 55 Bridge Street, Perth PH1 5RS, where I lived until September. Deliver to Ian McAllister, 7 Lochside Terrace, Stirling FK8 2QR instead."],
  [TWO, "Sophie Turnbull", "22 Abbey Gardens", "Bath", "BA2 6LN", "Sophie Turnbull here. Send the order to 22 Abbey Gardens, Bath BA2 6LN. My billing address stays as 9 Northfield Road, Bath BA1 4HP."],
  [TWO, "Kwame Mensah", "Flat 12, Albion House, Dock Road", "Liverpool", "L3 4BB", "Change of plan: I'll be at my new flat by then. Not 31 Elm Grove, Liverpool L7 8SN but Kwame Mensah, Flat 12, Albion House, Dock Road, Liverpool L3 4BB."],
  [SPREAD, "Elena Petrova", "45 Windsor Road", "Cardiff", "CF24 1DH", "Hi, it's Elena Petrova. I'm in Cardiff, on Windsor Road, at number 45. The postcode, if you need it, is CF24 1DH."],
  [SPREAD, "James Hartley", "2 The Green", "Malton", "YO17 7LX", "The postcode is YO17 7LX and the house is 2 The Green. That's in Malton. The order is in my name, James Hartley."],
  [SPREAD, "Nadia Hussain", "88 Clarence Street", "Leicester", "LE1 3RW", "You asked where to deliver. Leicester. The street is Clarence Street and we're number 88, the one with the blue door. LE1 3RW. Nadia Hussain."],
  [SIGNATURE, "Peter Vaughan", "16 Larch Rise", "Exeter", "EX4 5AD", "Please deliver my order to my home: Peter Vaughan, 16 Larch Rise, Exeter EX4 5AD.\n\n--\nPeter Vaughan, Facilities Manager\nBrennan Holt Surveyors, 200 Queen Street, Exeter EX1 1HS"],
  [SIGNATURE, "Chloe Bannister", "5 Rookery Lane", "Lincoln", "LN6 7PG", "Home delivery please, not the office: 5 Rookery Lane, Lincoln LN6 7PG.\n\nChloe Bannister\nAccounts Assistant\nTanaka Lab Ltd, 1 Science Park, Lincoln LN5 9ZZ"],
  [SIGNATURE, "Samir Qureshi", "73 Victoria Road", "Coventry", "CV1 3FJ", "Deliver to 73 Victoria Road, Coventry CV1 3FJ.\n\nKind regards,\nSamir Qureshi\nSent from Larkfield Robotics, Innovation Way, Coventry CV4 7AL"],
  [OTHER_PERSON, "Margaret Doyle", "30 Seaview Crescent", "Whitby", "YO21 3EZ", "It's a present for my mother, so please send it to her, not me: Margaret Doyle, 30 Seaview Crescent, Whitby YO21 3EZ. From her son Kevin Doyle."],
  [OTHER_PERSON, "Ben Achterberg", "11 Priory Mews", "Oxford", "OX2 6HJ", "I'm away that week, so please address the parcel to my neighbour: Ben Achterberg, 11 Priory Mews, Oxford OX2 6HJ. Regards, Lucy Farrow."],
  [OTHER_PERSON, "Helen Marsh", "4 Castle Road", "Durham", "DH1 4LS", "Please deliver the flowers to my sister, not to me. She is Helen Marsh, and she lives at 4 Castle Road, Durham DH1 4LS. Paid for by me, Robert Marsh."],
  [NONE, "", "", "", "", "Hi, when will my order arrive? I need it before the weekend."],
  [NONE, "Fiona Ashdown", "", "", "", "This is Fiona Ashdown. Please use the same address as last time."],
  [NONE, "", "", "", "", "Can you hold my delivery for a week? We're on holiday until the 21st."],
  [NONE, "George Pym", "", "", "CB5 8DZ", "George Pym here. I can't remember the full address of the new place yet, only the postcode: CB5 8DZ. I'll send the rest tomorrow."],
];

const heldBack: [name: string, street: string, city: string, postcode: string, email: string][] = [
  ["Ruth Calder", "9 Tannery Row", "York", "YO1 7HB", "Please send my order to Ruth Calder, 9 Tannery Row, York YO1 7HB."],
  ["", "", "", "", "Is my parcel coming today? The tracking page won't load."],
  ["Liam Brody", "Flat 4, 12 Quay Street", "Bristol", "BS1 4DJ", "New address for the order: Liam Brody, Flat 4, 12 Quay Street, Bristol BS1 4DJ. The old one on file is wrong."],
  ["Mei Tan", "Rose Cottage, Back Lane", "Hexham", "NE46 3PU", "It goes to Mei Tan at Rose Cottage, Back Lane, Hexham NE46 3PU. No number, just the name on the gate."],
  ["", "", "", "", "Please leave the parcel with a neighbour if I'm out. Thanks."],
  ["Arjun Patel", "31 Station Road", "Luton", "LU1 2QF", "I'm Arjun Patel. We're at number 31, on Station Road in Luton. Postcode LU1 2QF."],
  ["Clare Whitby", "", "", "", "Clare Whitby here, I'll email the address once we've completed on the house."],
  ["Owen Price", "Unit 2, Mill Court", "Stroud", "GL5 1AA", "Deliver to the workshop please: Owen Price, Unit 2, Mill Court, Stroud GL5 1AA."],
  ["Sara Lindqvist", "76 Park Avenue", "Hull", "HU5 3EX", "Not the Leeds address any more. Send it to Sara Lindqvist, 76 Park Avenue, Hull HU5 3EX."],
  ["", "", "", "HX1 2AB", "I only have the postcode to hand: HX1 2AB. Will that do for now?"],
];

const samePostcode = (a: unknown, b: unknown) => plain(a).replace(/ /g, "") === plain(b).replace(/ /g, "");
/** "27 Harbour Street, Flat 3" reaches the same door as "Flat 3, 27 Harbour Street". */
const parts = (line: unknown) => String(line ?? "").split(",").map(plain).filter(Boolean).sort().join("|");
const sameStreet = (a: unknown, b: unknown) => parts(a) === parts(b);

export const address: Feature = {
  id: "email_address",
  name: "Pull an address from an email",
  system:
    "You read an email a customer sent to Larkfield, an online home and garden shop, about where to deliver an order. Pull out the delivery address the customer wants used: the name the parcel should be addressed to, the street line, the town or city, and the postcode. Leave a field empty when the email doesn't give it.",
  ...fields({ name: { type: "string" }, street: { type: "string", same: sameStreet }, city: { type: "string" }, postcode: { type: "string", same: samePostcode } }),
  cases: rows.map(([kind, name, street, city, postcode, input], i): Case => ({ id: `address-${i + 1}`, input, expect: { name, street, city, postcode }, kind })),
  heldBack: heldBack.map(([name, street, city, postcode, input], i): Case => ({ id: `address-held-${i + 1}`, input, expect: { name, street, city, postcode }, kind: "held back" })),
};
