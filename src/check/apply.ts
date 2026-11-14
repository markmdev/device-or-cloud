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

/** The few lines of a web app that read the template: each feature's model takes its mode from Remote Config. */
export function appCode(verdicts: Verdict[]): string {
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

// One model for each feature, in the mode the check gave it.
const ${camel(names[0] ?? "mode_feature")} = getGenerativeModel(ai, {
  mode: getString(remoteConfig, "${names[0] ?? "mode_feature"}") as InferenceMode,
});
`;
}

/** The same few lines for an iPhone app, where Firebase AI Logic reaches Apple's on-device model. */
export function swiftCode(verdicts: Verdict[], cloudModel: string): string {
  const names = verdicts.map((v) => parameterFor(v.feature));
  const first = names[0] ?? "mode_feature";
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

// One model for each feature, in the mode the check gave it.
let mode = remoteConfig.configValue(forKey: "${first}").stringValue
let ${camel(first)}: any FirebaseAI.LanguageModel =
  mode == "prefer_on_device" ? HybridModel(primary: device, secondary: cloud) : cloud
`;
}

const camel = (name: string) => name.replace(/^mode_/, "").replace(/_+(\w)/g, (_, c: string) => c.toUpperCase()) + "Model";
