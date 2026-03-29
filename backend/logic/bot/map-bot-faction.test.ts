import { describe, expect, test } from "vitest";
import { Faction } from "../fixtures.js";
import { mapBotFactionToFactionCode } from "./map-bot-faction.js";

describe("mapBotFactionToFactionCode", () => {
  test.each([
    ["outcasts", Faction.OUTCASTS],
    ["guild", Faction.GUILD],
    ["bayou", Faction.BAYOU],
    ["arcanists", Faction.ARCANISTS],
    ["explorers society", Faction.EXPLORER],
    ["neverborn", Faction.NEVERBORN],
    ["ten thunders", Faction.THUNDERS],
    ["resurrectionists", Faction.RESSERS],
  ])('maps "%s" to %s', (input, expected) => {
    expect(mapBotFactionToFactionCode(input)).toBe(expected);
  });

  test("throws on unknown faction", () => {
    expect(() => mapBotFactionToFactionCode("unknown faction")).toThrow();
  });

  test("throws on old BOT bookmarklet names", () => {
    expect(() => mapBotFactionToFactionCode("thunders")).toThrow();
    expect(() => mapBotFactionToFactionCode("explorers")).toThrow();
  });
});
