// Prints the numbers of the results page from the same record: npm run results
import { readFileSync } from "node:fs";
import { printed } from "../src/results/numbers";

process.stdout.write(printed(JSON.parse(readFileSync("src/check/recorded.json", "utf8"))));
