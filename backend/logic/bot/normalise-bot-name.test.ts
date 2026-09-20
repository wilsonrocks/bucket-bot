import { describe, expect, test } from "vitest";
import { normaliseBotName } from "./normalise-bot-name";

describe("normaliseBotName", () => {
  test.each([
    ["  Patryk Moskal  ", "Patryk Moskal"],
    ["Jay  Malone", "Jay Malone"],
    ["Hugh\tK\nNeilson", "Hugh K Neilson"],
  ])('normalises "%s"', (input, expected) => {
    expect(normaliseBotName(input)).toBe(expected);
  });

  test("preserves case, so two spellings stay two names", () => {
    expect(normaliseBotName("kit prakkamakul")).toBe("kit prakkamakul");
    expect(normaliseBotName("Kit Prakkamakul")).toBe("Kit Prakkamakul");
  });
});
