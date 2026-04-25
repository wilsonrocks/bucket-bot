import { formatDate } from "date-fns";
import { EmbedBuilder, TextChannel } from "discord.js";
import { Kysely } from "kysely";
import { DB } from "kysely-codegen";
import { getDiscordClient } from "../discord-client";

const TOP_X_TEAMS = 16;

function formatRankChange(change: number | null, isNew: boolean): string {
  if (isNew) return "(NEW)";
  if (change === null) return "(BACK)";
  if (change === 0) return "";
  return change > 0 ? `(↑${change})` : `(↓${Math.abs(change)})`;
}

export const postTeamRankingsToDiscord = async (db: Kysely<DB>) => {
  const channelId = process.env.DISCORD_TEAM_RANKINGS_CHANNEL_ID;
  if (!channelId) {
    console.error("DISCORD_TEAM_RANKINGS_CHANNEL_ID is not defined");
    return;
  }

  const batch = await db
    .selectFrom("team_ranking_snapshot_batch")
    .selectAll()
    .where("type_code", "=", "ROLLING_YEAR")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!batch) {
    console.warn("No team ranking snapshot found for ROLLING_YEAR, skipping Discord post.");
    return;
  }

  const rankings = await db
    .selectFrom("team_ranking_snapshot")
    .innerJoin("team", "team_ranking_snapshot.team_id", "team.id")
    .where("batch_id", "=", batch.id)
    .select([
      "team_ranking_snapshot.rank",
      "team_ranking_snapshot.total_points",
      "team_ranking_snapshot.rank_change",
      "team_ranking_snapshot.new_team",
      "team.name as team_name",
    ])
    .orderBy("rank", "asc")
    .limit(TOP_X_TEAMS)
    .execute();

  const discordClient = await getDiscordClient();
  const channel = await discordClient.channels.fetch(channelId);

  if (!(channel instanceof TextChannel)) {
    throw new Error(`DISCORD_TEAM_RANKINGS_CHANNEL_ID is not a TextChannel`);
  }

  if (!channel.isSendable()) {
    console.warn("Team rankings channel is not sendable, skipping Discord post.");
    return;
  }

  const teamsText = rankings
    .map((r) => {
      return `#**${r.rank}** ${formatRankChange(r.rank_change, r.new_team)} - **${r.team_name}** (${r.total_points.toFixed(2)} pts)`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`Team Rankings as of ${formatDate(new Date(), "EEEE d MMM yyyy")}`)
    .setColor("#5865F2")
    .setDescription("Rolling year rankings — team score is the sum of the top 5 players' contributions.")
    .addFields({ name: "Teams", value: teamsText });

  await channel.send({
    content: `***BEEP BOOP!***

Here are the current team standings. See the full table on the website!`,
    embeds: [embed],
  });
};
