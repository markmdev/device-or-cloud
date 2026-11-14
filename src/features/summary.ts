import { fail, OK, words, type Case, type Feature } from "./types";

const PLAIN = "plain notes";
const TWO_DATES = "notes with an old date and a new one";
const ACTION = "notes that ask the customer to do something";
const SHORTHAND = "notes in a courier's shorthand";

/** Each group lists the ways one fact can be written; a summary must use one from every group. */
type Row = [kind: string, note: string, keep: string[][]];

const rows: Row[] = [
  [PLAIN, "Parcel collected from the Larkfield warehouse this morning and loaded for the overnight trunk to the Leeds depot. It will go out for delivery from there on Thursday between 8 am and 6 pm. No signature is needed.", [["thursday"]]],
  [PLAIN, "Delivered at 14:12 today. The driver left the parcel in the porch as the delivery instructions asked, and took a photo, which is attached to the order.", [["porch"]]],
  [PLAIN, "Your order has been split. The two armchairs leave the warehouse today and should arrive on Monday. The footstool is out of stock and will follow in a second parcel, with no extra delivery charge.", [["monday"], ["footstool"]]],
  [PLAIN, "The driver delivered the parcel to your neighbour at number 14 at 11:40, because nobody answered at your address. A card was put through your door to say so.", [["14"], ["neighbour", "neighbor"]]],
  [PLAIN, "The parcel reached the Bristol depot at 05:30 and is on the van for delivery today. The driver's round usually reaches your postcode between 1 pm and 3 pm.", [["today"]]],
  [PLAIN, "Your table was delivered by our two-person team at 10:05 and carried to the dining room. The team took the packaging away for recycling. The legs were fitted on site.", [["delivered"]]],
  [PLAIN, "We have received the item you sent back. It arrived at the returns centre on Wednesday and passed inspection. Your refund has been sent and takes 3 to 5 working days to reach your card.", [["refund"], ["3 to 5", "3-5", "3–5", "three to five"]]],
  [TWO_DATES, "Your delivery was booked for Tuesday 17 November. The van has broken down and the round is cancelled. We have rebooked you for Thursday 19 November, same time slot, 8 am to 12 noon.", [["thursday", "19 november", "19th"]]],
  [TWO_DATES, "The parcel missed the sorting cut-off at the hub last night, so it will not arrive today, Friday, as planned. It is now due on Monday.", [["monday"]]],
  [TWO_DATES, "Storm warnings have closed the ferry route. Deliveries to the island planned for Wednesday will now go on the first sailing on Friday, weather allowing.", [["friday"]]],
  [TWO_DATES, "The mattress you ordered was due from the maker on 12 November but they have told us it will reach our warehouse on 20 November. We will deliver it to you on 23 November.", [["23 november", "23rd", "november 23"]]],
  [TWO_DATES, "Sorry, we gave you the wrong date. Your order is not coming tomorrow. The driver's round for your area is on Saturday, so it will be with you on Saturday morning.", [["saturday"]]],
  [TWO_DATES, "Customs held the parcel for two days for a routine check. It was released this afternoon. Delivery moves from Monday to Wednesday.", [["wednesday"]]],
  [ACTION, "The driver tried to deliver at 9:15 and nobody was in. The parcel has gone back to the depot. Please book a new delivery day on the tracking page within 5 days, or it will be returned to Larkfield.", [["book", "choose", "arrange", "schedule", "pick"], ["5 days", "five days"]]],
  [ACTION, "Your parcel is waiting at the Corner Stores pickup point on Mill Lane. Bring the collection code from your email and photo ID. It will be held until Friday 20 November.", [["corner stores"], ["id"], ["20 november", "friday", "20th"]]],
  [ACTION, "We could not find your address. The label says 12 Meadow Way but the driver found no number 12 on that road. Please reply with the right house number or a nearby landmark so we can try again.", [["house number", "address", "number"]]],
  [ACTION, "The sofa is too big for the standard van. A larger vehicle is needed and there must be someone at home to show the team in. Please phone the delivery team on the number in your order email to pick a day.", [["phone", "call", "ring", "contact"]]],
  [ACTION, "One of the two boxes arrived at the depot damaged and we have not sent it out. The other box will be delivered tomorrow. Tell us whether you want the damaged item replaced or refunded.", [["tomorrow"], ["replace"], ["refund"]]],
  [ACTION, "Your parcel needs a signature from someone aged 18 or over, because it contains garden tools with blades. Please make sure an adult is at home on Tuesday between 10 am and 2 pm.", [["18", "adult"], ["tuesday"]]],
  [SHORTHAND, "ATT DEL 0915 - NO ANS - CARD LEFT - RTD DEPOT - REDEL NEXT WKG DAY", [["next working day", "next business day", "tomorrow"]]],
  [SHORTHAND, "DEL TO SAFE PLACE (SHED) 1632 PER CUST INSTR. PHOTO TAKEN.", [["shed"]]],
  [SHORTHAND, "PCL DMG IN TRANSIT - HELD AT HUB - SENDER NOTIFIED - REPLACEMENT TO BE DISPATCHED", [["damage"], ["replace"]]],
  [SHORTHAND, "OUT FOR DEL - ETA 1300-1500 - SIG REQ", [["sign"]]],
  [SHORTHAND, "ADDR QUERY - NO SUCH NO. ON RD - AWAITING CUST CONTACT - HELD 3 DAYS THEN RTS", [["3 days", "three days"]]],
  [SHORTHAND, "COLL FROM SENDER 1105 - IN TRANSIT TO HUB - DEL DUE 16/11", [["16"]]],
  [PLAIN, "Your order was packed this afternoon and handed to the courier at 17:05. It is on its way to the Glasgow depot and will be delivered on Tuesday. You do not need to be in.", [["tuesday"]]],
  [PLAIN, "Delivered at 08:55 today. The driver handed the parcel to a member of staff at your building's concierge desk, who signed for it.", [["concierge", "desk", "staff"]]],
  [PLAIN, "Your order is coming in two parts. The bed frame was sent today and will arrive on Wednesday. The mattress is being made and will follow in about two weeks.", [["wednesday"], ["mattress"]]],
  [PLAIN, "The driver left your parcel in the garage at 15:20, as your delivery instructions asked. A photo of where it was left is on your order page.", [["garage"]]],
  [PLAIN, "Your parcel arrived at the Norwich depot overnight and has been loaded on the van. It will be delivered today, most likely between 10 am and midday.", [["today"]]],
  [PLAIN, "Our fitters delivered and installed your wardrobe at 13:30. They levelled it, fitted the doors and took all the packaging away.", [["install", "fitted", "delivered", "assembled"]]],
  [PLAIN, "The replacement lamp shade was posted to you today by first class post. It should arrive within two working days. You can keep or throw away the broken one.", [["two working days", "2 working days", "two days", "2 days", "two business days", "2 business days"]]],
  [TWO_DATES, "Your sofa was due on Monday 16 November. The maker has had a delay with the fabric. The new delivery day is Monday 30 November, and we will phone the day before.", [["30 november", "30th", "november 30"]]],
  [TWO_DATES, "The courier's depot was closed yesterday for a power cut, so your parcel did not go out on Thursday. It is on the van today, Friday.", [["today", "friday"]]],
  [TWO_DATES, "We told you your order would arrive on Saturday. That was a mistake: the driver for your area only delivers on weekdays. It will arrive on Monday.", [["monday"]]],
  [TWO_DATES, "Snow has closed the pass road. Tuesday's delivery to your village is postponed until Thursday, when the road is expected to reopen.", [["thursday"]]],
  [TWO_DATES, "Your order was booked for 18 November. One item failed our quality check and is being replaced, so everything will now be sent together on 25 November.", [["25 november", "25th", "november 25"]]],
  [TWO_DATES, "The parcel was sent to the wrong depot by mistake. It will not be delivered today as planned. It is being moved tonight and will reach you tomorrow.", [["tomorrow"]]],
  [ACTION, "The driver could not leave the parcel because it needs a signature and nobody was home at 11:20. It is at the Elm Road post office. Collect it within 7 days and bring ID.", [["collect", "pick"], ["7 days", "seven days", "week"], ["id", "identification"]]],
  [ACTION, "Your order is ready but we need a phone number for the driver. Please add one on your order page by 6 pm today, or the delivery will move to next week.", [["number"], ["6 pm", "6pm", "18:00", "today"]]],
  [ACTION, "The lift in your building is out of order and the washing machine cannot be carried up the stairs safely. Please tell us when the lift is repaired so we can book a new day.", [["lift", "elevator"], ["tell", "let us know", "contact", "inform", "notify"]]],
  [ACTION, "The fridge freezer will arrive on Thursday morning. Please switch off and empty your old one the night before, as the team will take it away.", [["thursday"], ["empty", "switch off", "turn off", "unplug", "defrost"]]],
  [ACTION, "There is a customs charge of £18.40 to pay before your parcel can be released. Pay it using the link in the courier's text message within 10 days.", [["18.40"], ["10 days", "ten days"]]],
  [ACTION, "The parcel is too heavy for one person. Please make sure someone is at home on Friday to help the driver carry it from the kerb, or choose kerbside delivery on the tracking page.", [["friday"]]],
  [SHORTHAND, "DEL 1042 - SIGNED BY NEIGHBOUR NO.7 - CARD LEFT", [["neighbour", "neighbor"], ["7"]]],
  [SHORTHAND, "ATT DEL 1425 - BUSINESS CLOSED - 2ND ATT TOMORROW AM", [["tomorrow"]]],
  [SHORTHAND, "PCL AT PICKUP POINT (POST OFFICE HIGH ST) - HELD 10 DAYS - BRING ID", [["post office"], ["10 days", "ten days"], ["id", "identification"]]],
  [SHORTHAND, "DELAYED AT HUB - WEATHER - NEW ETA 21/11", [["21"]]],
  [SHORTHAND, "PART DEL 1 OF 3 BOXES - REMAINING 2 TO FOLLOW NEXT DAY", [["next day", "tomorrow", "following day"]]],
  [SHORTHAND, "RTS - REFUSED BY RECIPIENT AT DOOR 0930", [["refus", "declin", "reject"]]],
];

const heldBack: [note: string, keep: string[][]][] = [
  ["Your order left our warehouse at 16:20 and is with the courier. It should reach you on Wednesday. You will get a text with a one-hour slot on the morning of delivery.", [["wednesday"]]],
  ["Delivered at 09:48 and signed for by R. Evans at reception. The parcel was left at the front desk of your building.", [["reception", "front desk"]]],
  ["We planned to deliver on Friday 20 November, but the lorry bringing your wardrobe to our depot is delayed at the port. Your new delivery day is Tuesday 24 November.", [["tuesday", "24 november", "24th"]]],
  ["The driver could not get into your building because the entry code on the order did not work. Please send us the right code today so the parcel can go out again tomorrow.", [["code"], ["tomorrow"]]],
  ["DEL ATT 1410 - GATE LOCKED - NO ACCESS - PCL HELD AT DEPOT 5 DAYS - CUST TO ARRANGE REDEL", [["5 days", "five days"], ["arrange", "book", "schedule", "choose", "pick", "contact"]]],
  ["Your parcel has been handed to the local post office because we do not deliver to your area ourselves. They will bring it with your normal post within two working days.", [["post"], ["two working days", "2 working days", "two business days", "2 business days", "two days", "2 days"]]],
  ["The second of your three boxes has been found at our hub after going missing on Monday. All three boxes will now be delivered together on Thursday.", [["thursday"]]],
  ["Your collection is booked. The courier will pick up the faulty mower on Monday between 9 am and 1 pm. Please have it boxed and ready by the front door.", [["monday"], ["box"]]],
  ["OUT FOR DEL - 2 MAN CREW - CALL 30 MIN BEFORE ARR - ROOM OF CHOICE", [["call", "phone", "ring"], ["30"]]],
  ["The weather has stopped all deliveries in your postcode today. Nothing is wrong with your order. We will send a new date by email as soon as the roads reopen.", [["email"]]],
];

export const summary: Feature = {
  id: "delivery_summary",
  name: "Summarise a delivery note",
  system:
    "You turn a courier's or warehouse's note about an order from Larkfield, an online home and garden shop, into one sentence for the customer's order page. At most 25 words. Say what has happened or will happen, and what the customer has to do, if anything. Reply with the sentence only.",
  graded: "Every fact in the sentence is what the note says, nothing is invented, and if the note asks the customer to do something, the sentence says so. Leaving out minor details is fine.",
  check(answer, c) {
    const text = answer.trim();
    const count = words(text);
    if (count > 25) return fail(`${count} words; the limit is 25.`);
    if (/[.!?]\s+\S/.test(text)) return fail("More than one sentence.");
    const lower = text.toLowerCase();
    const missing = (c.expect as { keep: string[][] }).keep.find((ways) => !ways.some((w) => lower.includes(w)));
    if (missing) return fail(`Leaves out "${missing[0]}".`);
    return OK;
  },
  cases: rows.map(([kind, input, keep], i): Case => ({ id: `summary-${i + 1}`, input, expect: { keep }, kind })),
  heldBack: heldBack.map(([input, keep], i): Case => ({ id: `summary-held-${i + 1}`, input, expect: { keep }, kind: "held back" })),
};
