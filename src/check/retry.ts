const BUSY_WAITS = [5, 15, 30];

/**
 * What to do with a cloud request Google refused, from its message: the seconds to wait before sending it again,
 * "minute" or "day" when the free tier's requests are used up for that long, or undefined when the error stands.
 */
export function again(message: string, attempt: number): number | "minute" | "day" | undefined {
  if (message.includes("429")) {
    const retryIn = Number(/retry in ([\d.]+)s/.exec(message)?.[1]);
    if (/per day|PerDay/i.test(message)) return "day";
    return attempt >= 3 || !retryIn ? "minute" : retryIn + 1;
  }
  if (/\[50[03] \]/.test(message) && /high demand|overloaded/i.test(message)) return BUSY_WAITS[attempt];
  return undefined;
}
