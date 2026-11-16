import type { Feature } from "../features/types";
import { characters } from "./characters";
import { courses } from "./courses";
import { genre } from "./genre";
import { invoiceTemplate } from "./invoice";
import { pirate, seniorDev, shakespeare, teenager } from "./personas";
import { svg } from "./svg";
import { translation } from "./translation";
import { travel } from "./travel";
import { weather } from "./weather";

// The three repositories as read on 15 November 2026, each at the commit its links point to.
const WEB = "https://github.com/firebase/quickstart-js/blob/474e779bc3f0af1c620fb9dfa53e933e6aa3edd7/ai/";
const IOS = "https://github.com/firebase/quickstart-ios/blob/892ecac8dee09313b5b0c18b8313484ef4651c23/firebaseai/FirebaseAIExample/Shared/Models/Sample.swift";
const ANDROID = "https://github.com/firebase/quickstart-android/blob/153d77572e27715fae8e94269debefb5c25507b8/firebase-ai/app/src/main/java/com/google/firebase/quickstart/ai/feature/";

/** One fixed prompt of Firebase's own sample apps, with where it is in their repositories. */
export type Sample = { feature: Feature; from: string; link: string };

/** The prompts that are text in and text out, and whose text is in the repositories: the ones the check runs. */
export const SAMPLES: Sample[] = [
  { feature: genre, from: "Structured output with enum values, web quickstart", link: `${WEB}ai-samples/src/features/structured-output/service.ts` },
  { feature: weather, from: "Function calling, web, iOS and Android quickstarts", link: `${WEB}ai-samples/src/features/function-calling/service.ts` },
  { feature: characters, from: "Structured output with a schema, web quickstart", link: `${WEB}ai-samples/src/features/structured-output/service.ts` },
  { feature: invoiceTemplate, from: "Server prompt template, web and Android quickstarts", link: `${WEB}ai-samples/src/features/server-prompt-templates/README.md` },
  { feature: svg, from: "SVG generator, Android quickstart", link: `${ANDROID}text/SvgViewModel.kt` },
  { feature: translation, from: "Translation, Android quickstart", link: `${ANDROID}text/TranslationViewModel.kt` },
  { feature: travel, from: "Travel tips, iOS and Android quickstarts", link: IOS },
  { feature: courses, from: "Chatbot recommendations for courses, iOS and Android quickstarts", link: IOS },
  { feature: pirate, from: "Persona \"Pirate Captain\", web quickstart's chat app", link: `${WEB}ai-react-app/src/config/personas.ts` },
  { feature: shakespeare, from: "Persona \"Shakespearean Poet\", web quickstart's chat app", link: `${WEB}ai-react-app/src/config/personas.ts` },
  { feature: teenager, from: "Persona \"Sarcastic Teenager\", web quickstart's chat app", link: `${WEB}ai-react-app/src/config/personas.ts` },
  { feature: seniorDev, from: "Persona \"Helpful Senior Developer\", web quickstart's chat app", link: `${WEB}ai-react-app/src/config/personas.ts` },
];

/** The fixed prompts the check does not run, each once however many of the apps send it, with why. */
export const NOT_RUN: { why: string; prompts: { name: string; from: string; link: string }[] }[] = [
  {
    why: "They send a picture, a sound, a video or a PDF with the words. The check sends text only.",
    prompts: [
      { name: "Read the shop's name and the total from a photo of a receipt: Firebase's own hybrid sample", from: "Android", link: `${ANDROID}hybrid/HybridInferenceViewModel.kt` },
      { name: "Find what two pictures have in common: the second hybrid sample", from: "Android", link: `${ANDROID}hybrid/HybridImagePatternViewModel.kt` },
      { name: "Write a blog post from a photo of a meal", from: "iOS and Android", link: IOS },
      { name: "Describe the attached files", from: "web", link: `${WEB}ai-samples/src/features/multimodal/index.tsx` },
      { name: "Make hashtags for a video", from: "iOS and Android", link: IOS },
      { name: "Summarize a video", from: "iOS and Android", link: IOS },
      { name: "Describe what happens in a video", from: "web", link: `${WEB}ai-samples/src/features/video-analysis/index.tsx` },
      { name: "Summarize an audio file", from: "iOS and Android", link: IOS },
      { name: "Translate an audio file", from: "iOS and Android", link: IOS },
      { name: "Compare two PDF tax forms", from: "iOS and Android", link: IOS },
    ],
  },
  {
    why: "Their answer is a picture, which no on-device model here makes.",
    prompts: [
      { name: "A modern building by the water", from: "iOS", link: IOS },
      { name: "A pig with wings over a city", from: "iOS", link: IOS },
      { name: "The Eiffel Tower with fireworks", from: "web", link: `${WEB}ai-samples/src/features/image-generation/index.tsx` },
      { name: "A magazine cover", from: "Android", link: `${ANDROID}text/NanoBanana2ViewModel.kt` },
      { name: "A red panda sticker", from: "Android", link: `${ANDROID}text/NanoBananaLiteViewModel.kt` },
      { name: "A miniature London", from: "Android", link: `${ANDROID}text/NanoBananaProViewModel.kt` },
    ],
  },
  {
    why: "They need a search of the web, which only the cloud model has.",
    prompts: [
      { name: "What's the weather in Chicago this weekend?", from: "iOS and Android", link: IOS },
      { name: "Who won the euro 2024?", from: "web", link: `${WEB}ai-samples/src/features/grounding-with-google-search/index.tsx` },
    ],
  },
  {
    why: "Its text is a template kept in the sample's Firebase console, not in the repository.",
    prompts: [{ name: "Say hello to a named user in their language", from: "iOS", link: IOS }],
  },
];
