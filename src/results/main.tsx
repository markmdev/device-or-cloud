import { createRoot } from "react-dom/client";
import recorded from "../check/recorded.json";
import type { CheckRecord } from "../check/record";
import { FEATURES } from "../features";
import { ResultsPage } from "./page";

createRoot(document.getElementById("root")!).render(
  <ResultsPage
    record={recorded as CheckRecord}
    features={FEATURES}
    back={{ href: "/", label: "Back to the check" }}
    heading="The whole record behind the sample shop's check, misses included."
    wrote="We wrote every input ourselves. The first 25 of each feature came before the first recording. The other 25, and the 10 held back for each feature that has them, were written before any model had answered them."
    judged="A product title and a delivery note's summary have no single right answer."
    people
    source={
      <>
        The same numbers print from the same record in the project's repository: <code>npm install</code>, then <code>npm run results</code>. The
        record is the file <code>src/check/recorded.json</code>, and the inputs and their right answers are in <code>src/features/</code>.
      </>
    }
  />,
);
