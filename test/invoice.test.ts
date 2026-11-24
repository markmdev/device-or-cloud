import assert from "node:assert/strict";
import { test } from "node:test";
import { invoice, orderOf, totalOf } from "../src/features/invoice.ts";

test("the shop's code reads every order the check wrote back to the same total", () => {
  for (const c of invoice.cases) {
    const order = orderOf(c.input);
    assert.notEqual(typeof order, "string", c.input);
    assert.equal(totalOf(order as Exclude<typeof order, string>) / 100, (c.expect as { total: number }).total, c.input);
  }
});

test("a line the trade form doesn't take is named, not guessed", () => {
  assert.equal(orderOf("2 x Garden bench at £129.00 each\nPlus my usual discount"), "Plus my usual discount");
  assert.equal(orderOf("two benches please"), "two benches please");
});
