import { formatDate } from "date-fns";
import { EmbedBuilder } from "discord.js";
import { Kysely } from "kysely";
import { DB } from "kysely-codegen";
import { discordClient } from "../discord-client";
import { mostRecentSnapshot } from "../most-recent-snapshot";

const TOP_X_PLAYERS = 16;

export const postDiscordRankings = async (db: Kysely<DB>) => {
  const rankingTypes = await db
    .selectFrom("ranking_snapshot_type")
    .where("display", "!=", false)
    .selectAll()
    .execute();

  for (const { name, code: typeCode, description, hex_code } of rankingTypes) {
    const batch = await mostRecentSnapshot(db, typeCode);
    if (!batch) {
      console.warn(
        `No snapshot found for ranking type: ${typeCode}, skipping Discord post.`
      );
      continue;
    }

    const rankings = await db
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .innerJoin(
        "ranking_snapshot_batch",
        "ranking_snapshot.batch_id",
        "ranking_snapshot_batch.id"
      )
      .innerJoin(
        "ranking_snapshot_type",
        "ranking_snapshot_batch.type_code",
        "ranking_snapshot_type.code"
      )
      .leftJoin(
        "discord_user",
        "player.discord_id",
        "discord_user.discord_user_id"
      )
      .where("batch_id", "=", batch.id)
      .select([
        "discord_user.discord_display_name",
        "discord_user.discord_nickname",
        "discord_user.discord_username",
        "player.name",
        "player.longshanks_name",
        "ranking_snapshot.rank",
        "ranking_snapshot.total_points",
        "ranking_snapshot_type.hex_code",
      ])
      .orderBy("rank", "asc")
      .limit(TOP_X_PLAYERS)
      .execute();

    // Here you would implement the logic to post rankings to Discord
    // For example, fetching the rankings and sending them to a Discord channel
    console.debug(`Posting rankings for type: ${typeCode}`, rankings);
    // ... your posting logic here ...

    // TODO have as env var
    const channel = await discordClient.channels.fetch("1447924241403220071");
    const isSendable = channel?.isSendable;
    if (!isSendable) {
      console.warn(
        `Channel is not sendable for type: ${typeCode}, skipping Discord post.`
      );
      continue;
    }

    const topPlayersText = rankings
      .map(
        (r) =>
          `#${r.rank} - ${
            r.discord_display_name ||
            r.discord_nickname ||
            r.discord_username ||
            r.name
          } (${r.total_points.toFixed(2)} pts)`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setDescription(`<@&1079826009727193188>\n${description}`) // Role mention for Event Enthusiast
      .setTitle(`${name} as of ${formatDate(new Date(), "EEEE d MMM yyyy")}`)
      .setColor(hex_code)
      .addFields(
        { name: "Players", value: topPlayersText },
        {
          name: "See the rest",
          value: `[here](${process.env.FRONTEND_URL}/site/rankings?typeCode=${typeCode})`,
        }
      );

    await channel.send({ embeds: [embed] });
  }
};
