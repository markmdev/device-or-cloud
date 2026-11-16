import { Schema } from "firebase/ai";
import { parse, plain, type Case, type Feature } from "../features/types";

const PLAIN = "city, state and a written date";
const NUMBERS = "dates written in numbers";
const NO_STATE = "well-known cities with no state given";
const TWINS = "city names that several states have";

type Call = { city: string; state: [short: string, long: string]; date: string };

// The first is the sample's own prompt, word for word. The rest are ours.
const rows: [string, string, Call][] = [
  [PLAIN, "What was the weather in Boston, MA on October 17, 2024?", { city: "Boston", state: ["MA", "Massachusetts"], date: "2024-10-17" }],
  [PLAIN, "What was the weather in Denver, CO on March 3, 2024?", { city: "Denver", state: ["CO", "Colorado"], date: "2024-03-03" }],
  [PLAIN, "What was the weather in Austin, TX on July 4, 2023?", { city: "Austin", state: ["TX", "Texas"], date: "2023-07-04" }],
  [PLAIN, "Tell me the weather in Seattle, Washington on the 9th of November 2024.", { city: "Seattle", state: ["WA", "Washington"], date: "2024-11-09" }],
  [PLAIN, "How was the weather in Miami, Florida on New Year's Day 2025?", { city: "Miami", state: ["FL", "Florida"], date: "2025-01-01" }],
  [PLAIN, "What was the weather like in Nashville, Tennessee on February 29, 2024?", { city: "Nashville", state: ["TN", "Tennessee"], date: "2024-02-29" }],
  [PLAIN, "What was the weather in Santa Fe, New Mexico on May 12, 2022?", { city: "Santa Fe", state: ["NM", "New Mexico"], date: "2022-05-12" }],
  [PLAIN, "Was it raining in Portland, Oregon on December 1, 2023?", { city: "Portland", state: ["OR", "Oregon"], date: "2023-12-01" }],
  [PLAIN, "What was the weather in Salt Lake City, UT on August 30, 2024?", { city: "Salt Lake City", state: ["UT", "Utah"], date: "2024-08-30" }],
  [NUMBERS, "What is the weather in San Francisco, CA on 2024-10-17?", { city: "San Francisco", state: ["CA", "California"], date: "2024-10-17" }],
  [NUMBERS, "What was the weather in Chicago, IL on 06/15/2024?", { city: "Chicago", state: ["IL", "Illinois"], date: "2024-06-15" }],
  [NUMBERS, "Weather in Phoenix, AZ on 1/9/2023?", { city: "Phoenix", state: ["AZ", "Arizona"], date: "2023-01-09" }],
  [NUMBERS, "What was the weather in Atlanta, GA on 2023-12-25?", { city: "Atlanta", state: ["GA", "Georgia"], date: "2023-12-25" }],
  [NUMBERS, "What was the weather in Minneapolis, MN on 11/30/2022?", { city: "Minneapolis", state: ["MN", "Minnesota"], date: "2022-11-30" }],
  [NUMBERS, "Weather for Honolulu, HI, 2025-02-14?", { city: "Honolulu", state: ["HI", "Hawaii"], date: "2025-02-14" }],
  [NO_STATE, "What was the weather in Boston on October 17, 2024?", { city: "Boston", state: ["MA", "Massachusetts"], date: "2024-10-17" }],
  [NO_STATE, "What was the weather in Las Vegas on April 2, 2024?", { city: "Las Vegas", state: ["NV", "Nevada"], date: "2024-04-02" }],
  [NO_STATE, "How was the weather in New Orleans on March 5, 2025?", { city: "New Orleans", state: ["LA", "Louisiana"], date: "2025-03-05" }],
  [NO_STATE, "What was the weather in Detroit on September 21, 2023?", { city: "Detroit", state: ["MI", "Michigan"], date: "2023-09-21" }],
  [NO_STATE, "What was the weather in Anchorage on January 15, 2024?", { city: "Anchorage", state: ["AK", "Alaska"], date: "2024-01-15" }],
  [TWINS, "What was the weather in Portland, ME on July 20, 2024?", { city: "Portland", state: ["ME", "Maine"], date: "2024-07-20" }],
  [TWINS, "What was the weather in Springfield, Illinois on May 1, 2024?", { city: "Springfield", state: ["IL", "Illinois"], date: "2024-05-01" }],
  [TWINS, "What was the weather in Springfield, Missouri on May 1, 2024?", { city: "Springfield", state: ["MO", "Missouri"], date: "2024-05-01" }],
  [TWINS, "What was the weather in Columbus, GA on June 6, 2023?", { city: "Columbus", state: ["GA", "Georgia"], date: "2023-06-06" }],
  [TWINS, "What was the weather in Kansas City, Kansas on October 31, 2024?", { city: "Kansas City", state: ["KS", "Kansas"], date: "2024-10-31" }],
];

const cases: Case[] = rows.map(([kind, input, expect], i) => ({ id: `weather-${i + 1}`, input, expect, kind }));

/** Function calling, from the web, iOS and Android quickstarts: the model has to call fetchWeather with the city, the state and the date. */
export const weather: Feature = {
  id: "sample_weather",
  name: "Call the weather function",
  system: "",
  // The declaration is the web sample's, word for word.
  tools: [
    {
      functionDeclarations: [
        {
          name: "fetchWeather",
          description: "Get the weather conditions for a specific city on a specific date",
          parameters: Schema.object({
            properties: {
              location: Schema.object({
                description: "The name of the city and its state for which to get the weather. Only cities in the USA are supported.",
                properties: {
                  city: Schema.string({ description: "The city of the location." }),
                  state: Schema.string({ description: "The US state of the location." }),
                },
              }),
              date: Schema.string({ description: "The date for which to get the weather. Date must be in the format: YYYY-MM-DD." }),
            },
          }),
        },
      ],
    },
  ],
  cases,
  check(answer, c) {
    const want = c.expect as Call;
    const args = parse(answer) as { location?: { city?: unknown; state?: unknown }; date?: unknown } | null;
    if (!args?.location) return { ok: false, reason: "The model answered in words and called no function." };
    const { city, state } = args.location;
    if (plain(city) !== plain(want.city)) return { ok: false, reason: `Asked for the city "${city}"; the right one is "${want.city}".` };
    if (!want.state.some((s) => plain(s) === plain(state))) return { ok: false, reason: `Asked for the state "${state}"; the right one is ${want.state[1]}.` };
    return args.date === want.date ? { ok: true } : { ok: false, reason: `Asked for the date "${args.date}"; the right one is ${want.date}.` };
  },
};
