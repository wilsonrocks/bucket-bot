import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
let sendable = true;

vi.mock("discord.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("discord.js")>();
  class TextChannel {
    isSendable = () => sendable;
    send = send;
  }
  return { ...actual, TextChannel };
});

vi.mock("../discord-client", async () => {
  const { TextChannel } = await import("discord.js");
  return {
    RANKING_REPORTER_ROLE_ID: "reporter-role-id",
    getDiscordClient: async () => ({
      channels: { fetch: async () => new (TextChannel as any)() },
    }),
  };
});

import { postPipelineSummary } from "./notify-ops";
import type { RunStepResult } from "./run-step";

const ok: RunStepResult = { runId: "r", stepKey: "generate-player", status: "success" };
const bad: RunStepResult = { runId: "r", stepKey: "post-player", status: "failed", error: "boom" };

describe("postPipelineSummary", () => {
  beforeEach(() => {
    send.mockReset();
    sendable = true;
    vi.stubEnv("DISCORD_OPS_CHANNEL_ID", "ops-channel");
  });
  afterEach(() => vi.unstubAllEnvs());

  const sent = () => send.mock.calls[0]![0];
  const title = () => sent().embeds[0].data.title as string;

  it("labels the summary with DEPLOY_ENV", async () => {
    vi.stubEnv("DEPLOY_ENV", "dev");
    await postPipelineSummary([ok], "scheduled");
    expect(title()).toContain("[dev]");
  });

  it("falls back to 'unknown env' when DEPLOY_ENV is unset", async () => {
    vi.stubEnv("DEPLOY_ENV", "");
    await postPipelineSummary([ok], "scheduled");
    expect(title()).toContain("[unknown env]");
  });

  it("pings ranking reporters on failure in prod", async () => {
    vi.stubEnv("DEPLOY_ENV", "prod");
    await postPipelineSummary([ok, bad], "scheduled");
    expect(sent().content).toContain("<@&reporter-role-id>");
    expect(sent().allowedMentions).toEqual({ roles: ["reporter-role-id"] });
  });

  it.each(["dev", ""])("does not ping on failure when DEPLOY_ENV is %j", async (env) => {
    vi.stubEnv("DEPLOY_ENV", env);
    // Player-mention flag must not affect admin pings.
    vi.stubEnv("MENTION_FOR_REAL", "true");
    await postPipelineSummary([ok, bad], "scheduled");
    expect(sent().content).toBeUndefined();
    expect(sent().allowedMentions).toEqual({ parse: [] });
  });

  it("does not ping when everything succeeded", async () => {
    vi.stubEnv("DEPLOY_ENV", "prod");
    await postPipelineSummary([ok], "scheduled");
    expect(sent().content).toBeUndefined();
  });

  it("does not send to a channel the bot can't send in", async () => {
    sendable = false;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await postPipelineSummary([ok], "scheduled");
    expect(send).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledWith(expect.stringContaining("not a sendable text channel"));
    err.mockRestore();
  });
});
