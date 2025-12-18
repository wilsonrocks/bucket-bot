import { describe, expect, test } from "vitest";
("");
import { powderMonkeyFaux3PlayersHtml } from "./html";
import { extractPlayersFromLongshanksHTML } from "./extract-longshanks-players";

describe("Extract Longshanks Players", () => {
  describe("should get correct number of players", () => {
    test("PowderMonkeyFaux3", () => {
      const playerData = extractPlayersFromLongshanksHTML(
        powderMonkeyFaux3PlayersHtml
      );
      expect(playerData.length).toBe(18);
    });

    test.todo("one where someone dropped");

    test.todo("one where a game is incomplete or people played no games");
  });

  describe("should extract players correctly", () => {
    test("PowderMonkeyFaux3", () => {
      const playerData = extractPlayersFromLongshanksHTML(
        powderMonkeyFaux3PlayersHtml
      );

      expect(playerData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "JFV - Jamie Varney",
            longshanksId: "15341",
            rank: 1,
            faction: "Neverborn",
            team: "Soulstone Syndicate",
            roundsPlayed: 3,
          }),
          expect.objectContaining({
            name: "Jack Zissell",
            longshanksId: "15183",
            rank: 9,
            faction: "Bayou",
            roundsPlayed: 3,
            team: "Green Jokers",
          }),

          expect.objectContaining({
            longshanksId: "35573",
            name: "Esme Bloomfield",
            rank: 8,
            faction: "Guild",
            team: undefined,
            roundsPlayed: 3,
          }),
          expect.objectContaining({
            longshanksId: "34362",
            name: "Ben Ault",
            rank: 18,
            faction: "Explorers Society",
            roundsPlayed: 3,
            team: "Green Jokers",
          }),
        ])
      );
    });
  });
});
