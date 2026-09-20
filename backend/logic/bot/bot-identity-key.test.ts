import { describe, expect, test } from "vitest";
import { botIdentityKey, normaliseBotName } from "./bot-identity-key";

const BOT_ID = "vLE3u3XyknPlq0aECFYO";

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

describe("botIdentityKey", () => {
  test("uses profileId when the entry is linked to a BOT profile", () => {
    expect(
      botIdentityKey(
        { name: "Patryk Moskal", profileId: "profile-VTS1w7STz1YKmQkq3S_5Ti" },
        BOT_ID,
      ),
    ).toBe("profile-VTS1w7STz1YKmQkq3S_5Ti");
  });

  test("keeps a bare profileId verbatim, prefix or no prefix", () => {
    // Both forms are live in the API and a player is consistently one or the
    // other, so neither may be rewritten.
    expect(
      botIdentityKey({ name: "Hugh K Neilson", profileId: "L1neSZpibJHezECatcUn" }, BOT_ID),
    ).toBe("L1neSZpibJHezECatcUn");
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["whitespace only", "   "],
  ])("falls back to an event-scoped name key when profileId is %s", (_label, profileId) => {
    expect(botIdentityKey({ name: "James Coyle", profileId }, BOT_ID)).toBe(
      "vLE3u3XyknPlq0aECFYO:James Coyle",
    );
  });

  test("falls back when profileId is absent entirely", () => {
    expect(botIdentityKey({ name: "James Coyle" }, BOT_ID)).toBe(
      "vLE3u3XyknPlq0aECFYO:James Coyle",
    );
  });

  test("normalises the name in the fallback key", () => {
    expect(botIdentityKey({ name: " James  Coyle ", profileId: null }, BOT_ID)).toBe(
      "vLE3u3XyknPlq0aECFYO:James Coyle",
    );
  });

  test("scopes the fallback to the event, so the same name repeats as a new key", () => {
    expect(botIdentityKey({ name: "James Coyle", profileId: null }, "event-one")).not.toBe(
      botIdentityKey({ name: "James Coyle", profileId: null }, "event-two"),
    );
  });
});
