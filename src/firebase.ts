import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, type GenerativeModel } from "firebase/ai";
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import type { Feature } from "./features";

// Firebase Hosting serves the project's own config here, so none of it lives in the repo.
const config = await (await fetch("/__/firebase/init.json")).json();
export const app = initializeApp(config);

if (import.meta.env.DEV) {
  (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
}
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});

const ai = getAI(app, { backend: new GoogleAIBackend() });

export const CLOUD_MODEL = "gemini-3.5-flash-lite";
/** A different model from both that are checked: it judges the judged answers a second time. */
export const SECOND_GRADER = "gemini-3.8-flash";
export type Mode = InferenceMode;
export const MODES = Object.values(InferenceMode);

const models = new Map<string, GenerativeModel>();

/**
 * One feature's model in one mode. The instruction and the output shape are given twice because the SDK
 * sends each side its own: the cloud reads the request's settings, Chrome's model reads the session's.
 */
export function modelFor(feature: Pick<Feature, "id" | "system" | "schema" | "tools">, mode: Mode, cloudModel = CLOUD_MODEL): GenerativeModel {
  const key = `${feature.id}:${mode}:${cloudModel}`;
  let model = models.get(key);
  if (!model) {
    model = getGenerativeModel(ai, {
      mode,
      inCloudParams: {
        model: cloudModel,
        systemInstruction: feature.system || undefined,
        tools: feature.tools,
        generationConfig: feature.schema ? { responseMimeType: "application/json", responseJsonSchema: feature.schema } : undefined,
      },
      onDeviceParams: {
        createOptions: feature.system ? { initialPrompts: [{ role: "system", content: [{ type: "text", value: feature.system }] }] } : undefined,
        promptOptions: feature.schema ? { responseConstraint: feature.schema } : undefined,
      },
    });
    models.set(key, model);
  }
  return model;
}

export type DeviceState = "unsupported" | "unavailable" | "downloadable" | "downloading" | "available";

export async function deviceState(): Promise<DeviceState> {
  if (typeof LanguageModel === "undefined") return "unsupported";
  return LanguageModel.availability();
}

/** Starts the download of Chrome's model; it must be called from a click. */
export function downloadDeviceModel(onProgress: (share: number) => void): Promise<void> {
  return getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE }).initializeDeviceModel(onProgress);
}
