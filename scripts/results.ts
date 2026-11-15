// Prints the numbers of the results page from the same record: npm run results
// People's marks on the judged answers are kept in the project's Firestore, not in the record, so they are read from there.
import { readFileSync } from "node:fs";
import { markKey, type Mark } from "../src/results/judges";
import { printed } from "../src/results/numbers";

const project = JSON.parse(readFileSync(".firebaserc", "utf8")).projects.default;
const marks = new Map<string, Mark>();
for (let page = ""; ; ) {
  const reply = await (await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/labels?pageSize=300${page}`)).json();
  for (const { fields: f } of reply.documents ?? []) marks.set(markKey(f.feature.stringValue, f.input.stringValue, f.answer.stringValue), { good: f.good.booleanValue, by: f.by.stringValue });
  if (!reply.nextPageToken) break;
  page = `&pageToken=${reply.nextPageToken}`;
}
process.stdout.write(printed(JSON.parse(readFileSync("src/check/recorded.json", "utf8")), marks));
