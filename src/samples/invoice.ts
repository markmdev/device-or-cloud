import { plain, type Case, type Feature } from "../features/types";

const PLAIN = "plain names";
const TITLED = "names with a title or a suffix";
const MARKS = "names with accents, hyphens or apostrophes";
const FIRMS = "company names";
const ODD = "names that read like something else";

// "Jane Doe" is the Android sample's own input. The rest are ours.
const rows: [string, string][] = [
  [PLAIN, "Jane Doe"],
  [PLAIN, "Peter Novak"],
  [PLAIN, "Amara Okafor"],
  [PLAIN, "Liam Chen"],
  [PLAIN, "Sofia Rossi"],
  [PLAIN, "Tom Baker"],
  [TITLED, "Dr. Helen Marsh"],
  [TITLED, "Prof. Daniel Weiss"],
  [TITLED, "Robert King Jr."],
  [TITLED, "Sir Alan Whitby"],
  [TITLED, "Ms. Priya Raman"],
  [MARKS, "Renée O'Connor"],
  [MARKS, "José Núñez"],
  [MARKS, "Anne-Marie Dubois"],
  [MARKS, "Søren Kjærgaard"],
  [MARKS, "Zoë D'Angelo"],
  [FIRMS, "Brightwater Plumbing Ltd"],
  [FIRMS, "North Street Bakery"],
  [FIRMS, "Hill & Sons Roofing"],
  [FIRMS, "Alder Dental Practice"],
  [FIRMS, "Kestrel Cycles"],
  [ODD, "April May"],
  [ODD, "Bill Sales"],
  [ODD, "Penny Cash"],
  [ODD, "Mark Total"],
  // Ten more of ours, written on 16 November before any model answered them.
  [PLAIN, "Grace Hall"],
  [PLAIN, "Omar Haddad"],
  [TITLED, "Dr. Samuel Ortiz"],
  [TITLED, "Lady Margaret Ashby"],
  [MARKS, "Chloé Lefèvre"],
  [MARKS, "Seán O'Brien"],
  [FIRMS, "Riverside Garden Centre"],
  [FIRMS, "Foxglove Books"],
  [ODD, "Bill Due"],
  [ODD, "Rob Banks"],
];

const cases: Case[] = rows.map(([kind, name], i) => ({ id: `invoice-${i + 1}`, input: `Create an example customer invoice for a customer named ${name}.`, expect: name, kind }));

/** An item of an invoice written as a table row or a list entry: a line that starts like one and holds an amount. */
const ITEM = /^\s*(\||[-*•]|\d+[.)])\s?.*\d/;

/** The server prompt template "invoice-generator", from the web quickstart's README. Its text lives in the Firebase console; the README gives it. */
export const invoiceTemplate: Feature = {
  id: "sample_invoice",
  name: "Write an example invoice for a customer",
  system: "All output must be a clearly structured invoice document.\nUse a tabular or clearly delineated list format for line items.",
  cases,
  check(answer, c) {
    if (!plain(answer).includes(plain(c.expect))) return { ok: false, reason: `The invoice doesn't name the customer, ${c.expect}.` };
    if (answer.split("\n").filter((line) => ITEM.test(line)).length < 2) return { ok: false, reason: "The line items aren't in a table or a list." };
    return /total/i.test(answer) ? { ok: true } : { ok: false, reason: "The invoice has no total." };
  },
};
