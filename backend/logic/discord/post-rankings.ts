import { formatDate } from "date-fns";
import { ColorResolvable, EmbedBuilder, TextChannel } from "discord.js";
import { Kysely } from "kysely";
import { DB } from "kysely-codegen";
import { discordClient } from "../discord-client";
import { mostRecentSnapshot } from "../most-recent-snapshot";

const TOP_X_PLAYERS = 16;
function mentionIfPossible(player: {
  discord_user_id: string | null | undefined;
  name: string;
}): string {
  if (player.discord_user_id) {
    return `<@${player.discord_user_id}>`;
  } else {
    return player.name;
  }
}
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
        "discord_user.discord_user_id",
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

    console.debug(`Posting rankings for type: ${typeCode}`, rankings);

    const { discord_channel_id } = batch;
    if (!discord_channel_id) {
      console.warn(
        `No Discord channel ID configured for ranking type: ${typeCode}, skipping Discord post.`
      );
      continue;
    }
    const channel = await discordClient.channels.fetch(discord_channel_id);

    if (!(channel instanceof TextChannel)) {
      throw new Error(`Fetched channel is not a TextChannel, ${channel}`);
    }

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
          `#${r.rank} - ${mentionIfPossible(r)} (${r.total_points.toFixed(
            2
          )} pts)`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`${name} as of ${formatDate(new Date(), "EEEE d MMM yyyy")}`)
      .setColor(hex_code as ColorResolvable)
      .addFields(
        {
          name: "Note",
          value:
            "This is a weird set of data collate from SOME games from the past (including MWS🙃) so it does not reflect real rankings. Real data will start after 10 Jan with the first event of the year at Element!",
        },
        { name: "Players", value: topPlayersText },
        {
          name: "See the rest",
          value: `[here](${process.env.FRONTEND_URL}/site/rankings?typeCode=${typeCode})`,
        }
      );

    await channel.send({ embeds: [embed] });
  }
};
