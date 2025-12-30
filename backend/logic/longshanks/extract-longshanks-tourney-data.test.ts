import { describe, test, expect } from "vitest";
import { extractTourneyFromLongshanksHtml } from "./extract-longshanks-tourney-data";
import {
  malifauxYorkshireRumbleTourneyHtml,
  newFrontierTourneyHtml,
  ozMagicalMysteryTourTourneyHtml,
  powderMonkeyFaux3TourneyHtml,
} from "./html";

describe("extractLongshanksTourneyData", () => {
  describe("should extract correct data", () => {
    test("PowderMonkeyFaux3", () => {
      const tourneyData = extractTourneyFromLongshanksHtml(
        powderMonkeyFaux3TourneyHtml
      );

      expect(tourneyData.longshanksId).toEqual("21816");
      expect(tourneyData.name).toEqual("Powder Monkeyfaux III");
      expect(tourneyData.location).toContain("Powder Monkey Gaming");
      expect(tourneyData.date).toEqual("2025-03-09");
      expect(tourneyData.tournamentOrganiserId).toEqual("15173");
    });

    test("New Frontier", () => {
      const tourneyData = extractTourneyFromLongshanksHtml(
        newFrontierTourneyHtml
      );

      expect(tourneyData.longshanksId).toEqual("25681");
      expect(tourneyData.name).toEqual("New Frontier");
      expect(tourneyData.location).toContain("Virtual");
      expect(tourneyData.date).toEqual("2025-05-19");
      expect(tourneyData.tournamentOrganiserId).toEqual(undefined);
    });

    test("Oz Magical Mystery Tour", () => {
      const tourneyData = extractTourneyFromLongshanksHtml(
        ozMagicalMysteryTourTourneyHtml
      );

      expect(tourneyData.longshanksId).toEqual("22198");
      expect(tourneyData.name).toEqual("Oz's Magical Mystery Tour");
      expect(tourneyData.location).toContain("Battlefield Hobbies");
      expect(tourneyData.date).toEqual("2025-03-23");
      expect(tourneyData.tournamentOrganiserId).toEqual("3655");
    });

    test("Malifaux Yorkshire Rumble", () => {
      const tourneyData = extractTourneyFromLongshanksHtml(
        malifauxYorkshireRumbleTourneyHtml
      );

      expect(tourneyData.longshanksId).toEqual("21815");
    });
  });
});
