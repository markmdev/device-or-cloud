// What the page does with a refused cloud request, from the message the SDK passes on.
import assert from "node:assert/strict";
import test from "node:test";
import { again } from "../src/check/retry";

const AT = "AI: Error fetching from https://firebasevertexai.googleapis.com/v1beta/projects/device-or-cloud/models/gemini-3.5-flash-lite:generateContent: ";
// Google's own words on 16 November 2026 at 10:27, when this error ended a recording.
const BUSY = AT + "[500 ] This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.";
const MINUTE = AT + "[429 ] You exceeded your current quota. Quota exceeded for metric: generate_content_free_tier_requests, limit: 15. Please retry in 21.4s.";
const DAY = AT + "[429 ] You exceeded your current quota. Quota exceeded for metric: generate_content_free_tier_requests, limit: 500, GenerateRequestsPerDayPerProjectPerModel-FreeTier. Please retry in 21.4s.";
// The kind the second grader's first model gave for days, each after three minutes of waiting.
const DEAD = AT + "[503 ] Deadline expired before operation could complete.";

test("a busy model is asked again a few times, then the error stands", () => {
  for (const attempt of [0, 1, 2]) assert.equal(typeof again(BUSY, attempt), "number");
  assert.equal(again(BUSY, 3), undefined);
});

test("a full minute is waited out as long as Google says, a full day is not", () => {
  assert.equal(again(MINUTE, 0), 22.4);
  assert.equal(again(MINUTE, 3), "minute");
  assert.equal(again(DAY, 0), "day");
});

test("a model that never answers is not asked again", () => {
  assert.equal(again(DEAD, 0), undefined);
});
