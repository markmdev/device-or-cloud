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

/** The free tier's day ends at midnight in California; this is that moment on the reader's own clock. */
function freeRequestsReturn(): string {
  const [h, m, sec] = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .format(new Date())
    .split(":")
    .map(Number);
  const left = 86_400 - (h * 3600 + m * 60 + sec);
  return new Date(Date.now() + left * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** What to tell the reader when the free cloud requests run out. */
export const outOfRequests = (e: OutOfRequests) =>
  e.forToday
    ? `Today's free cloud requests are used up: everyone on this site shares 500 a day on Google's free tier. They come back at ${freeRequestsReturn()}.`
    : "The site's free cloud requests for this minute are used up: everyone here shares 15 a minute. Wait a minute and run it again.";

const sleep = (seconds: number) => new Promise((done) => setTimeout(done, seconds * 1000));

/** One request, as the app would send it. A full minute on the free tier is waited out; a full day isn't. */
export async function ask(feature: Pick<Feature, "id" | "system" | "schema">, mode: Mode, input: string, cloudModel?: string): Promise<Answer> {
  for (let attempt = 0; ; attempt++) {
    const started = performance.now();
    try {
      const { response } = await modelFor(feature, mode, cloudModel).generateContent(input);
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
