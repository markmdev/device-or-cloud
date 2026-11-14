import type { Feature } from "../features";
import { modeFor, NEITHER_ADVICE, VERDICT_NAME, verdictLine, type Verdict } from "./record";

/** The check runs Chrome's model, so its verdicts hold for Chrome on the web and nowhere else. */
export const CHROME = "Chrome on the web";
const CHROME_EXPRESSION = "app.browserAndVersion.inOne([browserName('Chrome').anyVersion])";

export const TEMPLATE_FILE = "remoteconfig.template.json";
export const DEPLOY = "firebase deploy --only remoteconfig";
export const parameterFor = (f: Feature) => `mode_${f.key ?? f.id}`;

/**
 * The verdicts as a Firebase Remote Config template: one parameter for each feature. Every feature stays in the cloud by
 * default; one the check moves to the device gets that mode under a condition for the platform the check ran on.
 */
export function template(verdicts: Verdict[]) {
  return {
    ...(verdicts.some((v) => v.kind === "device") ? { conditions: [{ name: CHROME, expression: CHROME_EXPRESSION, tagColor: "GREEN" }] } : {}),
    parameters: Object.fromEntries(
      verdicts.map((v) => [
        parameterFor(v.feature),
        {
          defaultValue: { value: "only_in_cloud" },
          ...(v.kind === "device" ? { conditionalValues: { [CHROME]: { value: modeFor(v) } } } : {}),
          description: `${v.feature.name}. ${VERDICT_NAME[v.kind]} ${v.kind === "fix" ? `${NEITHER_ADVICE} ` : ""}${verdictLine(v)}`,
          valueType: "STRING",
        },
      ]),
    ),
  };
}

export const templateText = (verdicts: Verdict[]) => JSON.stringify(template(verdicts), null, 2) + "\n";

/**
 * The lines of a web app that read the template: each feature's model takes its mode from Remote Config, and carries the
 * instruction and the answer's shape that were checked, for both sides.
 */
export function appCode(verdicts: Verdict[], cloudModel: string): string {
  const names = verdicts.map((v) => parameterFor(v.feature));
  return `import { getAI, getGenerativeModel, GoogleAIBackend, type InferenceMode } from "firebase/ai";
import { fetchAndActivate, getRemoteConfig, getString } from "firebase/remote-config";

const remoteConfig = getRemoteConfig(app);
// Until Remote Config has answered, and whenever it can't be reached, every feature stays in the cloud.
remoteConfig.defaultConfig = {
${names.map((name) => `  ${name}: "only_in_cloud",`).join("\n")}
};
await fetchAndActivate(remoteConfig).catch(() => {});

const ai = getAI(app, { backend: new GoogleAIBackend() });

function model(parameter: string, instruction: string, shape?: Record<string, unknown>) {
  return getGenerativeModel(ai, {
    mode: getString(remoteConfig, parameter) as InferenceMode,
    inCloudParams: {
      model: "${cloudModel}",
      systemInstruction: instruction,
      generationConfig: shape && { responseMimeType: "application/json", responseJsonSchema: shape },
    },
    onDeviceParams: {
      createOptions: { initialPrompts: [{ role: "system", content: [{ type: "text", value: instruction }] }] },
      promptOptions: shape && { responseConstraint: shape },
    },
  });
}

// One model for each feature, in the mode the check gave it, with the instruction and the shape it was checked with.
${verdicts
  .map((v, i) => `const ${camel(names[i])} = model(\n  "${names[i]}",\n  ${JSON.stringify(v.feature.system)},${v.feature.schema ? `\n  ${JSON.stringify(v.feature.schema)},` : ""}\n);`)
  .join("\n")}
`;
}

const camel = (name: string) => name.replace(/^mode_/, "").replace(/_+(\w)/g, (_, c: string) => c.toUpperCase()) + "Model";
