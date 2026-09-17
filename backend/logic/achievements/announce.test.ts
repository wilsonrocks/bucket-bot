import { describe, expect, it } from "vitest";
import { embedLength } from "discord.js";
import {
  achievementShareUrl,
  buildAchievementEmbed,
  buildAchievementMessage,
  MAX_EMBED_CHARS_PER_MESSAGE,
  type AnnouncedAchievement,
} from "./announce";

const achievement = (
  overrides: Partial<AnnouncedAchievement> = {},
): AnnouncedAchievement => ({
  playerId: 42,
  achievementId: "FIRST_EVENT",
  name: "Through the Breach",
  description: "Attend 1 event",
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
      "Attend 1 event\n\n> *A quote*\n> — Someone\n\nEarned at **Big Event** on 8 Mar 2025",
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
    expect(data.description).toBe("Attend 1 event\n\n> *A quote*\n\nEarned on 8 Mar 2025");
    expect(data.thumbnail).toBeUndefined();
  });

  it("omits a blank description and flavour text", () => {
    const { embeds } = buildAchievementMessage(
      "Alice",
      [achievement({ description: "", flavourText: " ", flavourSource: "Ignored" })],
      "https://assets.example",
    );
    expect(embeds[0]!.toJSON().description).toBe("Earned at **Big Event** on 8 Mar 2025");
  });

  it("quotes every line of multi-line flavour text", () => {
    const { embeds } = buildAchievementMessage(
      "Alice",
      [achievement({ flavourText: "one\ntwo", flavourSource: null })],
      "https://assets.example",
    );
    expect(embeds[0]!.toJSON().description).toMatch(/^Attend 1 event\n\n> \*one\*\n> \*two\*\n/);
  });

  it("bundles several achievements into one message", () => {
    const { content, embeds } = buildAchievementMessage(
      "Alice",
      [achievement(), achievement({ achievementId: "WIN_EVENT", name: "Winner" })],
      "https://assets.example",
    );
    expect(content).toBe("🏅 Alice has earned 2 new achievements!");
    expect(embeds.map((e) => e.toJSON().title)).toEqual([
      "Through the Breach",
      "Winner",
    ]);
  });

  it("stops at 10 embeds and reports which achievements were included", () => {
    const achievements = Array.from({ length: 12 }, (_, i) =>
      achievement({ achievementId: `A${i}`, name: `Achievement ${i}` }),
    );
    const { content, embeds, included } = buildAchievementMessage("Alice", achievements, undefined);
    expect(embeds).toHaveLength(10);
    expect(included.map((a) => a.achievementId)).toEqual(
      achievements.slice(0, 10).map((a) => a.achievementId),
    );
    expect(content).toBe("🏅 Alice has earned 10 new achievements!");
  });

  it("adds achievements one at a time until the next would exceed 6000 characters", () => {
    // Each embed is ~1500 characters, so only 3 fit under 6000.
    const achievements = Array.from({ length: 5 }, (_, i) =>
      achievement({ achievementId: `A${i}`, flavourText: "x".repeat(1450) }),
    );
    const single = embedLength(buildAchievementEmbed(achievements[0]!, undefined).data);
    const expectedCount = Math.floor(MAX_EMBED_CHARS_PER_MESSAGE / single);
    expect(expectedCount).toBe(3);

    const { embeds, included } = buildAchievementMessage("Alice", achievements, undefined);
    expect(included).toHaveLength(expectedCount);
    expect(embeds.reduce((n, e) => n + embedLength(e.data), 0)).toBeLessThanOrEqual(
      MAX_EMBED_CHARS_PER_MESSAGE,
    );
  });

  it("keeps a smaller later achievement out once one has been rejected, preserving order", () => {
    const achievements = [
      achievement({ achievementId: "BIG1", flavourText: "x".repeat(3000) }),
      achievement({ achievementId: "BIG2", flavourText: "x".repeat(3000) }),
      achievement({ achievementId: "SMALL", flavourText: "x" }),
    ];
    const { included } = buildAchievementMessage("Alice", achievements, undefined);
    expect(included.map((a) => a.achievementId)).toEqual(["BIG1"]);
  });

  it("links each embed title to the achievement's share page", () => {
    const { embeds } = buildAchievementMessage(
      "Alice",
      [achievement()],
      undefined,
      "https://site.example",
    );
    expect(embeds[0]!.toJSON().url).toBe(
      "https://site.example/player/42?tab=achievements&achievement=FIRST_EVENT",
    );
  });
});

describe("achievementShareUrl", () => {
  it("encodes the achievement id", () => {
    expect(
      achievementShareUrl({ playerId: 1, achievementId: "A&B" }, "https://site.example"),
    ).toBe("https://site.example/player/1?tab=achievements&achievement=A%26B");
  });
});
