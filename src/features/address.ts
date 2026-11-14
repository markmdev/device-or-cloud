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
  [PLAIN, "Imogen Walsh", "23 Chapel Street", "Wakefield", "WF1 2PQ", "Hi, could you send my order to Imogen Walsh, 23 Chapel Street, Wakefield, WF1 2PQ? Thank you."],
  [PLAIN, "Tariq Mahmood", "Flat 2, 9 Granary Wharf", "Gloucester", "GL1 2EH", "Delivery address: Tariq Mahmood, Flat 2, 9 Granary Wharf, Gloucester GL1 2EH. The buzzer is the top one."],
  [PLAIN, "Bethan Rhys", "Ty Gwyn, Mountain Road", "Brecon", "LD3 7UH", "Please post it to Bethan Rhys, Ty Gwyn, Mountain Road, Brecon LD3 7UH. The house has a name, not a number."],
  [PLAIN, "Callum Fraser", "140 Great Western Road", "Aberdeen", "AB10 6QE", "name: callum fraser\naddress: 140 great western road, aberdeen\npostcode: ab10 6qe"],
  [PLAIN, "Yasmin Okoye", "6 Tithe Barn Lane", "Taunton", "TA1 4BH", "Order #80233 should go to Yasmin Okoye, 6 Tithe Barn Lane, Taunton TA1 4BH. Ring the bell twice, it sticks."],
  [PLAIN, "Dominic Hale", "Unit 14, Riverside Works", "Sheffield", "S3 8GG", "It's for the studio: Dominic Hale, Unit 14, Riverside Works, Sheffield S3 8GG. Open weekdays 10 till 4."],
  [PLAIN, "Lorna Whitfield", "37 The Crescent", "Carlisle", "CA1 1RX", "Deliver to:\nLorna Whitfield\n37 The Crescent\nCarlisle\nCA1 1RX"],
  [PLAIN, "Henry Osei", "2A Market Place", "Ely", "CB7 4NP", "Hello, the bench goes to Henry Osei at 2A Market Place, Ely CB7 4NP. Mornings are best."],
  [TWO, "Freya Lindholm", "18 Saltwell View", "Gateshead", "NE8 4XS", "We completed on the new house last week. Forget 3 Coach Lane, Newcastle NE7 7XA; it's now Freya Lindholm, 18 Saltwell View, Gateshead NE8 4XS."],
  [TWO, "Patrick Doherty", "51 Lisburn Road", "Belfast", "BT9 7AA", "Your records have me at 12 Castle Court, Bangor BT20 3TB. I left there in the summer. Please deliver to Patrick Doherty, 51 Lisburn Road, Belfast BT9 7AA."],
  [TWO, "Anita Kapoor", "8 Wharf Cottages", "Skipton", "BD23 1RT", "Anita Kapoor here. Deliver to 8 Wharf Cottages, Skipton BD23 1RT. Keep 44 Otley Road, Leeds LS6 2AL as the billing address only."],
  [TWO, "Joel Abrams", "Flat 7, Sycamore House, Park Lane", "Croydon", "CR0 1JB", "Please ignore the address on the order (60 Mitcham Road, Croydon CR0 3RG). I've moved to Flat 7, Sycamore House, Park Lane, Croydon CR0 1JB. Joel Abrams."],
  [SPREAD, "Megan Tully", "29 Fore Street", "Totnes", "TQ9 5HN", "It's Megan Tully. The town is Totnes. You want Fore Street, and the number on the door is 29. Postcode TQ9 5HN."],
  [SPREAD, "Winston Clarke", "5 Jubilee Terrace", "Derby", "DE1 2LW", "DE1 2LW is the postcode, in Derby. The house is number 5 on Jubilee Terrace. Put Winston Clarke on the label."],
  [SPREAD, "Agnes Novak", "112 Holloway Road", "Shrewsbury", "SY1 3FD", "For the delivery: my name is Agnes Novak and I live in Shrewsbury. Holloway Road is the street, we're at 112, near the top of the hill. SY1 3FD."],
  [SIGNATURE, "Rachel Emsley", "40 Garden Walk", "Cambridge", "CB4 3EW", "Please send the parcel to my home address, 40 Garden Walk, Cambridge CB4 3EW.\n\nRachel Emsley\nSenior Planner\nHolt & Marlowe Architects, 3 Station Square, Cambridge CB1 2GA"],
  [SIGNATURE, "Dev Malhotra", "15 Weavers Close", "Preston", "PR1 8JN", "To my house please, 15 Weavers Close, Preston PR1 8JN, and not to work.\n\n--\nDev Malhotra | Operations\nNorthline Freight, Dock Estate, Preston PR2 2YL"],
  [SIGNATURE, "Kirsty Baird", "9 Glebe Road", "Inverness", "IV2 3QX", "Deliver to: Kirsty Baird, 9 Glebe Road, Inverness IV2 3QX.\n\nBest wishes,\nKirsty\nBaird Physiotherapy, 21 Union Street, Inverness IV1 1PP"],
  [OTHER_PERSON, "Edith Rowe", "7 Almshouse Row", "Salisbury", "SP1 2EJ", "This is a gift for my gran. Please address it to Edith Rowe, 7 Almshouse Row, Salisbury SP1 2EJ, not to me. Thanks, Jamie Rowe."],
  [OTHER_PERSON, "Nikhil Sharma", "33 Tavistock Gardens", "Ilford", "IG3 9BE", "I've ordered it for my brother's new flat. He is Nikhil Sharma and the address is 33 Tavistock Gardens, Ilford IG3 9BE. I'm paying: Anjali Sharma."],
  [OTHER_PERSON, "Moira Kemp", "The Lodge, Station Road", "Pitlochry", "PH16 5AN", "Could the hamper go straight to our friend Moira Kemp at The Lodge, Station Road, Pitlochry PH16 5AN? It's a surprise from David and Sue Larkin."],
  [NONE, "", "", "", "", "Has my order been sent yet? I haven't had a dispatch email."],
  [NONE, "Colin Draper", "", "", "", "Colin Draper here. The address on my account is correct, please use that one."],
  [NONE, "", "", "", "", "Can I change the delivery day to Saturday? Nobody is home in the week."],
  [NONE, "Tess Garland", "", "", "WR1 3NZ", "It's Tess Garland. I'm at my desk without my new address, I only know the postcode is WR1 3NZ. Street to follow."],
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
