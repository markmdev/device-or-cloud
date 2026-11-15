import { createRoot } from "react-dom/client";
import type { CheckRecord } from "../check/record";
import { ResultsPage } from "../results/page";
import { SAMPLES } from ".";
import recorded from "./recorded.json";

createRoot(document.getElementById("root")!).render(
  <ResultsPage
    record={recorded as CheckRecord}
    features={SAMPLES.map((s) => s.feature)}
    back={{ href: "/samples/", label: "Back to Firebase's sample prompts" }}
    heading="Every input and every answer behind the check of Firebase's sample prompts, misses included."
    wrote="Each prompt is Firebase's, word for word. A sample gives one input of its own, or none; we wrote the others on 15 November 2026, before any model had answered them."
    judged="A translation, a chat reply in a persona and a piece of advice have no single right answer."
    source={
      <>
        The record is the file <code>src/samples/recorded.json</code> in the project's repository. The prompts, their inputs and where each
        comes from in Firebase's repositories are in <code>src/samples/</code>.
      </>
    }
  />,
);
