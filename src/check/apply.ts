import type { Feature } from "../features";
import { fixRange, moves, VERDICT_NAME, type FixRecord, type Verdict } from "./record";

/** The check runs each platform's own model, so a verdict holds on that platform and nowhere else. */
export const CHROME = "Chrome on the web", IPHONE = "The iPhone app";
const EXPRESSION = { [CHROME]: "app.browserAndVersion.inOne([browserName('Chrome').anyVersion])", [IPHONE]: "device.os == 'ios'" };
const TAG = { [CHROME]: "GREEN", [IPHONE]: "BLUE" };

export const TEMPLATE_FILE = "remoteconfig.template.json";
export const DEPLOY = "firebase deploy --only remoteconfig";
const keyOf = (f: Feature) => f.key ?? f.id;
/** A feature's Remote Config parameters: its mode, the line added to its instruction, and whether its randomness is off. */
export const parameterFor = (f: Feature) => `mode_${keyOf(f)}`;
export const lineFor = (f: Feature) => `line_${keyOf(f)}`;
export const steadyFor = (f: Feature) => `steady_${keyOf(f)}`;

/**
 * One feature on one platform: its verdict as written, and the line or setting that moves it to the device, if one does.
 * `unsure` says the count that puts it on the device has a range that crosses the bar.
 */
export type Placed = { verdict: Verdict; fix?: FixRecord; unsure: boolean };
export const runsOnDevice = (p: Placed) => p.verdict.kind === "device" || !!p.fix;

/** Where a feature runs on one platform, in a few words, with its count as written. */
function placeLine(p: Placed): string {
  const v = p.verdict, count = `${v.inputsRight} of ${v.inputs} inputs right on every run`;
  if (p.fix) return `on the device with ${p.fix.steady ? steadyFor(v.feature) : lineFor(v.feature)}; as written, ${count}`;
  switch (v.kind) {
    case "device": return `on the device, ${count}`;
    case "cloud": return `in the cloud, ${count} on the device`;
    case "fix": return `neither model is good enough, ${count} on the device`;
    default: return VERDICT_NAME[v.kind].replace(/\.$/, "").toLowerCase();
  }
}

/**
 * The check's result as a Firebase Remote Config template. Every feature has a mode, in the cloud by default; one that can
 * run on the device gets prefer_on_device under a condition for the platform whose model the check ran. Where that takes a
 * line added to the instruction, or the model's randomness off, the line or the setting is a parameter of its own under
 * the same condition, so the app that reads the mode reads what the mode was measured with.
 * `apple` holds the same features on Apple's model, where the check has them.
 */
export function template(chrome: Placed[], apple?: Placed[]) {
  const platforms: { name: keyof typeof EXPRESSION; placed: Placed[] }[] = [{ name: CHROME, placed: chrome }];
  if (apple) platforms.push({ name: IPHONE, placed: apple });
  const conditions = platforms.filter((p) => p.placed.some(runsOnDevice)).map(({ name }) => ({ name, expression: EXPRESSION[name], tagColor: TAG[name] }));
  const under = (i: number, value: (p: Placed) => string | undefined) =>
    Object.fromEntries(platforms.flatMap((p) => { const v = value(p.placed[i]); return v === undefined ? [] : [[p.name, { value: v }]]; }));
  const parameters: Record<string, object> = {};
  chrome.forEach(({ verdict: { feature } }, i) => {
    const modes = under(i, (p) => (runsOnDevice(p) ? "prefer_on_device" : undefined));
    parameters[parameterFor(feature)] = {
      defaultValue: { value: "only_in_cloud" },
      ...(Object.keys(modes).length ? { conditionalValues: modes } : {}),
      description: `${feature.name}. ${platforms.map((p) => `${p.name}: ${placeLine(p.placed[i])}.`).join(" ")}`,
      valueType: "STRING",
    };
    const lines = under(i, (p) => (p.fix && !p.fix.steady ? p.fix.line : undefined));
    if (Object.keys(lines).length) {
      parameters[lineFor(feature)] = {
        defaultValue: { value: "" },
        conditionalValues: lines,
        description: `${feature.name}: one more sentence at the end of its instruction. As written the on-device model is outside the bar. With this line the check found it within, on its own inputs and on inputs held back.`,
        valueType: "STRING",
      };
    }
    const steady = under(i, (p) => (p.fix?.steady ? "true" : undefined));
    if (Object.keys(steady).length) {
      parameters[steadyFor(feature)] = {
        defaultValue: { value: "false" },
        conditionalValues: steady,
        description: `${feature.name}: the on-device model's randomness off, so it always gives its most likely answer. As written it is outside the bar. With this setting the check found it within, on its own inputs and on inputs held back.`,
        valueType: "BOOLEAN",
      };
    }
  });
  return { ...(conditions.length ? { conditions } : {}), parameters };
}

/**
 * The fixes tried on a feature on one platform, in the order the page shows them and the template picks from: a setting,
 * which changes no prompt, then the cloud model's own line, then one a person wrote.
 */
export function fixesFor(fixes: Record<string, FixRecord[]> | undefined, feature: Feature, onIphone: boolean): FixRecord[] {
  const place = (fix: FixRecord) => (fix.steady ? 0 : fix.by === "cloud" ? 1 : 2);
  return (fixes?.[feature.id] ?? []).filter((fix) => (fix.on === "apple") === onIphone).sort((a, b) => place(a) - place(b));
}

/**
 * Each feature on a platform, with the line or setting the template ships with it, where one is needed: the first that moves a
 * feature kept in the cloud to the device at this bar, or the first that settles a device verdict whose range crosses the bar.
 */
export const placedOn = (verdicts: Verdict[], fixes: Record<string, FixRecord[]> | undefined, onIphone: boolean, allowed: number): Placed[] =>
  verdicts.map((verdict) => {
    const tried = fixesFor(fixes, verdict.feature, onIphone), f = verdict.feature;
    const settles = (fix: FixRecord) => moves(f, fix, allowed) && !fixRange(f, fix, allowed)?.unsure;
    const fix = verdict.kind === "cloud" ? tried.find((fix) => moves(f, fix, allowed)) : verdict.kind === "device" && verdict.unsure ? tried.find(settles) : undefined;
    return { verdict, fix, unsure: fix ? !!fixRange(f, fix, allowed)?.unsure : verdict.kind === "device" && !!verdict.unsure };
  });

export const templateText = (chrome: Placed[], apple?: Placed[]) => JSON.stringify(template(chrome, apple), null, 2) + "\n";

/**
 * The lines of a web app that read the template: each feature's model takes its mode from Remote Config, and with it the
 * line the check found it needs, and carries the instruction and the answer's shape that were checked, for both sides.
 */
export function appCode(verdicts: Verdict[], cloudModel: string): string {
  const keys = verdicts.map((v) => keyOf(v.feature));
  return `import { getAI, getGenerativeModel, GoogleAIBackend, type InferenceMode } from "firebase/ai";
import { fetchAndActivate, getRemoteConfig, getString } from "firebase/remote-config";

const remoteConfig = getRemoteConfig(app);
// Until Remote Config has answered, and whenever it can't be reached, every feature stays in the cloud.
remoteConfig.defaultConfig = {
${keys.map((key) => `  mode_${key}: "only_in_cloud",`).join("\n")}
};
await fetchAndActivate(remoteConfig).catch(() => {});

const ai = getAI(app, { backend: new GoogleAIBackend() });

function model(feature: string, instruction: string, shape?: Record<string, unknown>) {
  // Where the check moved a feature to the device with one more line, the line comes with the mode.
  const line = getString(remoteConfig, "line_" + feature);
  const system = line ? instruction + " " + line : instruction;
  return getGenerativeModel(ai, {
    mode: getString(remoteConfig, "mode_" + feature) as InferenceMode,
    inCloudParams: {
      model: "${cloudModel}",
      systemInstruction: system,
      generationConfig: shape && { responseMimeType: "application/json", responseJsonSchema: shape },
    },
    onDeviceParams: {
      createOptions: { initialPrompts: [{ role: "system", content: [{ type: "text", value: system }] }] },
      promptOptions: shape && { responseConstraint: shape },
    },
  });
}

// One model for each feature, in the mode the check gave it, with the instruction and the shape it was checked with.
${verdicts
  .map((v, i) => `const ${camel(keys[i])}Model = model(\n  "${keys[i]}",\n  ${JSON.stringify(v.feature.system)},${v.feature.schema ? `\n  ${JSON.stringify(v.feature.schema)},` : ""}\n);`)
  .join("\n")}
`;
}

/**
 * The same for a Swift app: a session carries a feature's instruction, with its line, to whichever model answers, in the
 * mode Remote Config gives the feature, and its requests carry the setting.
 */
export function swiftCode(verdicts: Verdict[], cloudModel: string): string {
  const keys = verdicts.map((v) => keyOf(v.feature));
  return `import FirebaseAILogic
import FirebaseRemoteConfig
import FoundationModels

let remoteConfig = RemoteConfig.remoteConfig()
// Until Remote Config has answered, and whenever it can't be reached, every feature stays in the cloud.
remoteConfig.setDefaults([
${keys.map((key) => `  "mode_${key}": "only_in_cloud" as NSObject,`).join("\n")}
])
_ = try? await remoteConfig.fetchAndActivate()

let ai = FirebaseAI.firebaseAI(backend: .googleAI())
let cloud = ai.geminiModel(name: "${cloudModel}")
let device = FirebaseAI.SystemLanguageModel.default

/// A new session for one request of a feature, in the mode the check gave it.
func session(_ feature: String, instructions: String) -> GenerativeModelSession {
  let mode = remoteConfig.configValue(forKey: "mode_" + feature).stringValue
  // Where the check moved a feature to the device with one more line, the line comes with the mode.
  let line = remoteConfig.configValue(forKey: "line_" + feature).stringValue
  let model: any FirebaseAI.LanguageModel =
    mode == "prefer_on_device" ? HybridModel(primary: device, secondary: cloud) : cloud
  return ai.generativeModelSession(model: model, instructions: line.isEmpty ? instructions : instructions + " " + line)
}

/// What to pass as a request's options: where the check moved a feature to the device with
/// the model's randomness off, Apple's model gives its most likely answer every time.
func options(_ feature: String) -> any GenerationOptionsRepresentable {
  remoteConfig.configValue(forKey: "steady_" + feature).boolValue
    ? FoundationModels.GenerationOptions(sampling: .greedy) : ResponseGenerationOptions.default
}

// One for each feature, with the instruction it was checked with. Ask for the answer's shape with
// respond(to:generating:options:) and a Generable type that has the fields the check used.
${verdicts
  .map((v, i) => `func ${camel(keys[i])}Session() -> GenerativeModelSession {\n  session("${keys[i]}", instructions: ${JSON.stringify(v.feature.system)})\n}`)
  .join("\n")}
`;
}

const camel = (key: string) => key.replace(/_+(\w)/g, (_, c: string) => c.toUpperCase());
