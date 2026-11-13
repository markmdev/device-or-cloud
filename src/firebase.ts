import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Firebase Hosting serves the project's own config here, so none of it lives in the repo.
const config = await (await fetch("/__/firebase/init.json")).json();
const app = initializeApp(config);

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});

const ai = getAI(app, { backend: new GoogleAIBackend() });

export const CLOUD_MODEL = "gemini-3.5-flash-lite";

export const onDevice = getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE });

export const inCloud = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_IN_CLOUD,
  inCloudParams: { model: CLOUD_MODEL },
});
