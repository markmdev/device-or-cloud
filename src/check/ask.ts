import { AIError, InferenceMode, InferenceSource } from "firebase/ai";
import type { Feature } from "../features";
import { modelFor, type Mode } from "../firebase";

export type Answer = {
  text: string;
  /** Where the SDK says the answer ran. */
  source?: InferenceSource;
  seconds: number;
  tokensIn?: number;
  tokensOut?: number;
};

export class OutOfRequests extends Error {
  constructor(readonly forToday: boolean) {
    super(forToday ? "Today's free cloud requests are used up." : "Too many cloud requests this minute.");
  }
}

const sleep = (seconds: number) => new Promise((done) => setTimeout(done, seconds * 1000));

/** One request, as the app would send it. A full minute on the free tier is waited out; a full day isn't. */
export async function ask(feature: Pick<Feature, "id" | "system" | "schema">, mode: Mode, input: string): Promise<Answer> {
  for (let attempt = 0; ; attempt++) {
    const started = performance.now();
    try {
      const { response } = await modelFor(feature, mode).generateContent(input);
      const usage = response.usageMetadata;
      return {
        text: response.text().trim(),
        source: response.inferenceSource,
        seconds: (performance.now() - started) / 1000,
        tokensIn: usage?.promptTokenCount,
        tokensOut: usage ? (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0) : undefined,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!(e instanceof AIError) || !message.includes("429")) throw e;
      const retryIn = Number(/retry in ([\d.]+)s/.exec(message)?.[1]);
      const forToday = /per day|PerDay/i.test(message);
      if (forToday || attempt >= 3 || !retryIn) throw new OutOfRequests(forToday);
      await sleep(retryIn + 1);
    }
  }
}

export const DEVICE = InferenceMode.ONLY_ON_DEVICE;
export const CLOUD = InferenceMode.ONLY_IN_CLOUD;
