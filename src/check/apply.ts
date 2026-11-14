import type { Feature } from "../features";
import { APPLES, modeFor, VERDICT_NAME, verdictLine, type Verdict } from "./record";

/** The check runs each platform's own model, so a verdict holds on that platform and nowhere else. */
export const CHROME = "Chrome on the web", IPHONE = "The iPhone app";
const EXPRESSION = { [CHROME]: "app.browserAndVersion.inOne([browserName('Chrome').anyVersion])", [IPHONE]: "device.os == 'ios'" };
const TAG = { [CHROME]: "GREEN", [IPHONE]: "BLUE" };

export const TEMPLATE_FILE = "remoteconfig.template.json";
export const DEPLOY = "firebase deploy --only remoteconfig";
export const parameterFor = (f: Feature) => `mode_${f.key ?? f.id}`;

/**
 * The verdicts as a Firebase Remote Config template: one parameter for each feature. Every feature stays in the cloud by
 * default; one the check moves to the device gets that mode under a condition for the platform whose model the check ran.
 * `apple` holds the same features' verdicts on Apple's model, where the check has them.
 */
export function template(verdicts: Verdict[], apple?: Verdict[]) {
  const platforms: { name: keyof typeof EXPRESSION; verdicts: Verdict[] }[] = [{ name: CHROME, verdicts }];
  if (apple) platforms.push({ name: IPHONE, verdicts: apple });
  const conditions = platforms.filter((p) => p.verdicts.some((v) => v.kind === "device")).map(({ name }) => ({ name, expression: EXPRESSION[name], tagColor: TAG[name] }));
  return {
    ...(conditions.length ? { conditions } : {}),
    parameters: Object.fromEntries(
      verdicts.map((v, i) => {
        const moved = platforms.filter((p) => p.verdicts[i].kind === "device");
        return [
          parameterFor(v.feature),
          {
            defaultValue: { value: "only_in_cloud" },
            ...(moved.length ? { conditionalValues: Object.fromEntries(moved.map((p) => [p.name, { value: modeFor(p.verdicts[i]) }])) } : {}),
            description: `${v.feature.name}. ${VERDICT_NAME[v.kind]} ${verdictLine(v)}${apple ? ` In the iPhone app: ${VERDICT_NAME[apple[i].kind]} ${verdictLine(apple[i], APPLES)}` : ""}`,
            valueType: "STRING",
          },
        ];
      }),
    ),
  };
}

export const templateText = (verdicts: Verdict[], apple?: Verdict[]) => JSON.stringify(template(verdicts, apple), null, 2) + "\n";

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

/**
 * The same for a Swift app: a session carries a feature's instruction to whichever model answers, in the mode Remote
 * Config gives the feature.
 */
export function swiftCode(verdicts: Verdict[], cloudModel: string): string {
  const names = verdicts.map((v) => parameterFor(v.feature));
  return `import FirebaseAILogic
import FirebaseRemoteConfig

let remoteConfig = RemoteConfig.remoteConfig()
// Until Remote Config has answered, and whenever it can't be reached, every feature stays in the cloud.
remoteConfig.setDefaults([
${names.map((name) => `  "${name}": "only_in_cloud" as NSObject,`).join("\n")}
])
_ = try? await remoteConfig.fetchAndActivate()

let ai = FirebaseAI.firebaseAI(backend: .googleAI())
let cloud = ai.geminiModel(name: "${cloudModel}")
let device = FirebaseAI.SystemLanguageModel.default

/// A new session for one request of a feature, in the mode the check gave it.
func session(_ parameter: String, instructions: String) -> GenerativeModelSession {
  let mode = remoteConfig.configValue(forKey: parameter).stringValue
  let model: any FirebaseAI.LanguageModel =
    mode == "prefer_on_device" ? HybridModel(primary: device, secondary: cloud) : cloud
  return ai.generativeModelSession(model: model, instructions: instructions)
}

// One for each feature, with the instruction it was checked with. Ask for the answer's shape
// with respond(to:generating:) and a Generable type that has the fields the check used.
${verdicts
  .map((v, i) => `func ${camel(names[i]).replace(/Model$/, "Session")}() -> GenerativeModelSession {\n  session("${names[i]}", instructions: ${JSON.stringify(v.feature.system)})\n}`)
  .join("\n")}
`;
}

const camel = (name: string) => name.replace(/^mode_/, "").replace(/_+(\w)/g, (_, c: string) => c.toUpperCase()) + "Model";
