import { vi } from "vitest";

// Neutralise the Discord client for every test file. Without a bot token tests
// physically cannot log in, but this makes it explicit and loud: any code path
// that reaches getDiscordClient in a test throws unless that test provides its
// own mock. Tests that assert posting override this per-file (see permissions.test.ts).
vi.mock("./logic/discord-client.ts", async (importActual) => ({
  ...(await importActual<typeof import("./logic/discord-client.ts")>()),
  getDiscordClient: vi.fn(async () => {
    throw new Error(
      "getDiscordClient is disabled in tests — provide a per-file vi.mock if this test needs Discord",
    );
  }),
}));
