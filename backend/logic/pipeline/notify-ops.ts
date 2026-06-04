import { EmbedBuilder, TextChannel } from "discord.js";
import { RANKING_REPORTER_ROLE_ID, getDiscordClient } from "../discord-client.js";
import type { RunStepResult, StepTrigger } from "./run-step.js";

const STATUS_EMOJI: Record<RunStepResult["status"], string> = {
  success: "✅",
  failed: "❌",
  skipped: "⏭️",
  running: "⏳",
};

/**
 * Posts a summary of a pipeline run to the ops channel (DISCORD_OPS_CHANNEL_ID).
 * Posts on every run — green when all steps succeeded, red with the offending
 * steps otherwise. Never throws: a missing channel/env var is logged and ignored
 * so notification problems don't fail the run.
 */
export async function postPipelineSummary(
  results: RunStepResult[],
  trigger: StepTrigger,
): Promise<void> {
  const channelId = process.env.DISCORD_OPS_CHANNEL_ID;
  if (!channelId) {
    console.warn("DISCORD_OPS_CHANNEL_ID is not set; skipping pipeline summary post");
    return;
  }

  const problems = results.filter((r) => r.status !== "success");
  const allGood = problems.length === 0;

  const lines = results.map((r) => {
    const base = `${STATUS_EMOJI[r.status]} \`${r.stepKey}\` — ${r.status}`;
    return r.error ? `${base}: ${r.error.split("\n")[0]}` : base;
  });

  const embed = new EmbedBuilder()
    .setTitle(
      `${allGood ? "✅" : "❌"} Rankings pipeline (${trigger}) — ${allGood ? "all steps succeeded" : `${problems.length} step(s) need attention`}`,
    )
    .setColor(allGood ? 0x2ecc71 : 0xe74c3c)
    .setDescription(lines.join("\n"))
    .setTimestamp(new Date());

  try {
    const channel = await (await getDiscordClient()).channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel) || !channel.isSendable) {
      console.error(`DISCORD_OPS_CHANNEL_ID ${channelId} is not a sendable text channel`);
      return;
    }
    // Ping the ranking reporters when something needs attention.
    await channel.send(
      allGood
        ? { embeds: [embed] }
        : {
            content: `<@&${RANKING_REPORTER_ROLE_ID}> a rankings pipeline step needs attention`,
            embeds: [embed],
            allowedMentions: { roles: [RANKING_REPORTER_ROLE_ID] },
          },
    );
  } catch (err) {
    console.error("Failed to post pipeline summary to Discord:", err);
  }
}
