import { describe, expect, it } from "vitest";
import { buildAchievementMessage, type AnnouncedAchievement } from "./announce";

const achievement = (
  overrides: Partial<AnnouncedAchievement> = {},
): AnnouncedAchievement => ({
  achievementId: "first-event",
  name: "Through the Breach",
  flavourText: "A quote",
  flavourSource: "Someone",
  imageKey: "achievement/abc",
  tourneyName: "Big Event",
  achievedOn: "2025-03-08",
  ...overrides,
});

describe("buildAchievementMessage", () => {
  it("builds a single achievement message with quote, source, event and image", () => {
    const { content, embeds } = buildAchievementMessage(
      "<@123>",
      [achievement()],
      "https://assets.example",
    );
    expect(content).toBe("🏅 <@123> has earned a new achievement!");
    expect(embeds).toHaveLength(1);
    const data = embeds[0]!.toJSON();
    expect(data.title).toBe("Through the Breach");
    expect(data.description).toBe(
      "> *A quote*\n> — Someone\n\nEarned at **Big Event** on 8 Mar 2025",
    );
    expect(data.thumbnail?.url).toBe(
      "https://assets.example/achievement/abc-w400.webp",
    );
  });

  it("omits source, event and image when absent", () => {
    const { embeds } = buildAchievementMessage(
      "Alice",
      [achievement({ flavourSource: null, imageKey: null, tourneyName: null })],
      "https://assets.example",
    );
    const data = embeds[0]!.toJSON();
    expect(data.description).toBe("> *A quote*\n\nEarned on 8 Mar 2025");
    expect(data.thumbnail).toBeUndefined();
  });

  it("quotes every line of multi-line flavour text", () => {
    const { embeds } = buildAchievementMessage(
      "Alice",
      [achievement({ flavourText: "one\ntwo", flavourSource: null })],
      "https://assets.example",
    );
    expect(embeds[0]!.toJSON().description).toMatch(/^> \*one\*\n> \*two\*\n/);
  });

  it("bundles several achievements into one message", () => {
    const { content, embeds } = buildAchievementMessage(
      "Alice",
      [achievement(), achievement({ achievementId: "first-victory", name: "Winner" })],
      "https://assets.example",
    );
    expect(content).toBe("🏅 Alice has earned 2 new achievements!");
    expect(embeds.map((e) => e.toJSON().title)).toEqual([
      "Through the Breach",
      "Winner",
    ]);
  });
});
