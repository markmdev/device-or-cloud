// Writes the shop's features for the iPhone app, so both apps send the same instructions, shapes and inputs, and builds
// the check's own code into one script the app runs, so both apps judge answers the same way: npm run ios
import { writeFileSync } from "node:fs";
import { build } from "vite";
import { parameterFor } from "../src/check/apply";
import { FEATURES } from "../src/features";
import { SHOWN } from "../src/shop/present";

const inputs = (cases: { id: string; input: string }[] = []) => cases.map(({ id, input }) => ({ id, input }));

const features = FEATURES.map((f) => {
  const { label, heading, button } = SHOWN[f.id];
  return { id: f.id, parameter: parameterFor(f), name: f.name, system: f.system, schema: f.schema, label, heading, button, cases: inputs(f.cases), heldBack: inputs(f.heldBack) };
});
writeFileSync("ios/Larkfield/features.json", JSON.stringify(features, null, 1) + "\n");

await build({
  configFile: false,
  logLevel: "warn",
  build: {
    lib: { entry: "src/check/phone.ts", name: "check", formats: ["iife"], fileName: () => "check.js" },
    outDir: "ios/Larkfield",
    emptyOutDir: false,
    copyPublicDir: false,
  },
});
