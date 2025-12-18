import { describe, expect, test } from "vitest";
("");
import {
  newFrontierPlayersHtml,
  ozMagicalMysteryTourPlayersHtml,
  powderMonkeyFaux3PlayersHtml,
} from "./html";
import { extractPlayersFromLongshanksHTML } from "./extract-longshanks-players";

describe("Extract Longshanks Players", () => {
  describe("should get correct number of players", () => {
    test("PowderMonkeyFaux3", () => {
      const playerData = extractPlayersFromLongshanksHTML(
        powderMonkeyFaux3PlayersHtml
      );
      expect(playerData.length).toBe(18);
    });

    test("New Frontier MWS", () => {
      const playerData = extractPlayersFromLongshanksHTML(
        newFrontierPlayersHtml
      );
      expect(playerData.length).toBe(32);
    });

    test("Oz's Magical Mystery Tour", () => {
      const playerData = extractPlayersFromLongshanksHTML(
        ozMagicalMysteryTourPlayersHtml
      );
      expect(playerData.length).toBe(32);
    });
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

  describe("New Frontier MWS", () => {
    test("should extract players who dropped", () => {
      const playerData = extractPlayersFromLongshanksHTML(
        newFrontierPlayersHtml
      );

      expect(playerData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Dylan J Lee",
          }),
          expect.objectContaining({ name: "Dan JustDiesel H" }),
        ])
      );
    });
  });

  describe("Oz's Magical Mystery Tour", () => {
    test("should NOT extract players who dropped before playing games", () => {
      const playerData = extractPlayersFromLongshanksHTML(
        ozMagicalMysteryTourPlayersHtml
      );

      expect(playerData).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Dave Roberts",
          }),
          expect.objectContaining({ name: "Oz Rampage Games Goff" }),
        ])
      );
    });
  });
});
