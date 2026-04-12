import { formatDate } from "date-fns";
import { ColorResolvable, EmbedBuilder, TextChannel } from "discord.js";
import { Kysely } from "kysely";
import { DB } from "kysely-codegen";
import {
  getDiscordClient,
  MENTION_EVENT_ENTHUSIAST,
  mentionUser,
} from "../discord-client";
import { mostRecentSnapshot } from "../most-recent-snapshot";

const TOP_X_PLAYERS = 16;

function formatRankChange(change: number | null, isNew: boolean): string {
  if (isNew) return " `NEW`";
  if (change === null) return " `RE`";
  if (change === 0) return " -";
  return change > 0 ? ` ↑${change}` : ` ↓${Math.abs(change)}`;
}

// TODO move to own file
export function mentionIfPossible(player: {
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
  const discordClient = await getDiscordClient();
  const rankingTypes = await db
    .selectFrom("ranking_snapshot_type")
    .where("display", "!=", false)
    .selectAll()
    .execute();

  let topPlayer;
  let newPlayers;

  for (const { name, code: typeCode, description, hex_code } of rankingTypes) {
    const batch = await mostRecentSnapshot(db, typeCode);
    if (!batch) {
      console.warn(
        `No snapshot found for ranking type: ${typeCode}, skipping Discord post.`,
      );
      continue;
    }

    const rankings = await db
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .innerJoin(
        "ranking_snapshot_batch",
        "ranking_snapshot.batch_id",
        "ranking_snapshot_batch.id",
      )
      .innerJoin(
        "ranking_snapshot_type",
        "ranking_snapshot_batch.type_code",
        "ranking_snapshot_type.code",
      )
      .leftJoin(
        "discord_user",
        "player.discord_id",
        "discord_user.discord_user_id",
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
        "ranking_snapshot.player_id",
        "ranking_snapshot_type.hex_code",
        "ranking_snapshot.rank_change",
        "ranking_snapshot.new_player",
      ] as const)
      .orderBy("rank", "asc")
      .limit(TOP_X_PLAYERS)
      .execute();

    if (typeCode === "ROLLING_YEAR") {
      topPlayer = rankings[0];

      newPlayers = await db
        .selectFrom("ranking_snapshot")
        .innerJoin("player", "ranking_snapshot.player_id", "player.id")
        .leftJoin(
          "discord_user",
          "player.discord_id",
          "discord_user.discord_user_id",
        )
        .where("batch_id", "=", batch.id)
        .where("new_player", "is", true)
        .selectAll()
        .execute();
    }

    const { discord_channel_id } = batch;
    if (!discord_channel_id) {
      console.warn(
        `No Discord channel ID configured for ranking type: ${typeCode}, skipping Discord post.`,
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
        `Channel is not sendable for type: ${typeCode}, skipping Discord post.`,
      );
      continue;
    }

    const topPlayersText = rankings
      .map((r) => {
        return `#${r.rank} - ${r.name} (${r.total_points.toFixed(2)} pts)${formatRankChange(r.rank_change, r.new_player)}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`${name} as of ${formatDate(new Date(), "EEEE d MMM yyyy")}`)
      .setColor(hex_code as ColorResolvable)
      .setDescription(description)
      .addFields({ name: "Players", value: topPlayersText });

    await channel.send({
      content: `***BEEP BOOP!***

Here is your weekly breakfast of rankings that I have cooked from data. I hope that it is tasty and nutritious and sustains you until you can next play in an event and generate more data for me. Enjoy!

There's only a maximum of ${TOP_X_PLAYERS} players shown here. But you can see the full rankings [on the website](${process.env.FRONTEND_URL}/site/rankings?typeCode=${typeCode})!

      `,

      embeds: [embed],
    });
  }
  // post in the announcements one
  const announceChannelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
  if (announceChannelId) {
    const announceChannel =
      await discordClient.channels.fetch(announceChannelId);

    if (!(announceChannel instanceof TextChannel)) {
      throw new Error(
        `Fetched announceChannel is not a TextChannel, ${announceChannel}`,
      );
    }

    const isSendable = announceChannel?.isSendable();
    if (isSendable) {
      announceChannel.send(`***BEEP-BOOP*** ${MENTION_EVENT_ENTHUSIAST}

New rankings are out! Please check all the channels for the different ranking types.

${topPlayer?.discord_user_id ? `Well done to ${mentionUser(topPlayer)} for being the current Top Dog. Please try to beat them.` : ""}

${
  newPlayers &&
  newPlayers.length &&
  `
It's really important the community keeps growing (or rebuilding with 4th Edition), so a huge shout out to 
${newPlayers?.map((player) => mentionUser(player)).join("\n")}
 who are ranked for the first time(under this system)!
 
 `
}

        `);
    }
  } else {
    // TODO come up with a nicer way of checking channels etc, maybe grab them all on initialisation?
    console.error("DISCORD_ANNOUNCE_CHANNEL_ID is not defined");
  }
};
