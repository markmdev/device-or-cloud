// Writes the shop's features for the iPhone app, so both apps send the same instructions, shapes and inputs: npm run ios
import { writeFileSync } from "node:fs";
import { parameterFor } from "../src/check/apply";
import { FEATURES } from "../src/features";
import { SHOWN } from "../src/shop/present";

const inputs = (cases: { id: string; input: string }[] = []) => cases.map(({ id, input }) => ({ id, input }));

const features = FEATURES.map((f) => {
  const { label, heading, button } = SHOWN[f.id];
  return { id: f.id, parameter: parameterFor(f), name: f.name, system: f.system, schema: f.schema, label, heading, button, cases: inputs(f.cases), heldBack: inputs(f.heldBack) };
});
writeFileSync("ios/Larkfield/features.json", JSON.stringify(features, null, 1) + "\n");
