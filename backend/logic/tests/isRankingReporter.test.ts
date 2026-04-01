import { describe, expect, test, vi } from "vitest";

vi.mock("../../logic/discord-client.js", () => ({
  getDiscordClient: vi.fn(),
  RANKING_REPORTER_ROLE_ID: "reporter-role-id",
  UK_MALIFAUX_SERVER_ID: "guild-id",
}));

import { getDiscordClient } from "../../logic/discord-client.js";
import { isRankingReporter } from "../../routes/v1/permissions.js";

function makeMockDiscordClient(hasRole: boolean) {
  vi.mocked(getDiscordClient).mockResolvedValue({
    guilds: {
      fetch: vi.fn().mockResolvedValue({
        members: {
          fetch: vi.fn().mockResolvedValue({
            roles: { cache: { has: vi.fn().mockReturnValue(hasRole) } },
          }),
        },
      }),
    },
  } as any);
}

// ── isRankingReporter permission check ────────────────────────────────────

describe("isRankingReporter permission check", () => {
  test("returns false when user does not have the reporter role", async () => {
    makeMockDiscordClient(false);
    const result = await isRankingReporter("some-discord-user-id");
    expect(result).toBe(false);
  });

  test("returns true when user has the reporter role", async () => {
    makeMockDiscordClient(true);
    const result = await isRankingReporter("some-discord-user-id");
    expect(result).toBe(true);
  });
});
