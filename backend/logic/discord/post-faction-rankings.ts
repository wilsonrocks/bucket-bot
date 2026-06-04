import { ColorResolvable, EmbedBuilder, TextChannel } from "discord.js";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { getDiscordClient } from "../discord-client.js";

const { DISCORD_FACTION_CHANNEL_ID, DISCORD_TEST_CHANNEL_ID } = process.env;
if (!DISCORD_FACTION_CHANNEL_ID) {
  throw new Error("DISCORD_FACTION_CHANNEL_ID env var is not set");
}
if (!DISCORD_TEST_CHANNEL_ID) {
  throw new Error("DISCORD_TEST_CHANNEL_ID env var is not set");
}

function formatRankChange(change: number | null): string {
  if (change === null) return "`NEW`";
  if (change === 0) return "-";
  return change > 0 ? `↑${change}` : `↓${Math.abs(change)}`;
}

/**
 * Posts the most recent faction snapshot to Discord. Posts to the live faction
 * channel when `live` is true, otherwise the test channel. Throws if there is
 * no snapshot or the target channel is unusable.
 */
export async function postFactionRankings(
  db: Kysely<DB>,
  { live }: { live: boolean },
): Promise<void> {
  const channelId = live ? DISCORD_FACTION_CHANNEL_ID! : DISCORD_TEST_CHANNEL_ID!;

  const mostRecentSnapshotBatch = await db
    .selectFrom("faction_snapshot_batch")
    .select("id")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!mostRecentSnapshotBatch) {
    throw new Error("No faction snapshot batch available.");
  }

  const snapshot = await db
    .selectFrom("faction_snapshot")
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction.name as faction_name",
      "faction_snapshot.rank as rank",
      "faction_snapshot.faction_code as faction_code",
      "faction_snapshot.total_points as total_points",
      "faction_snapshot.declarations as declarations",
      "faction_snapshot.declaration_rate as declaration_rate",
      "faction_snapshot.points_per_declaration as points_per_declaration",
      "faction.hex_code as hex_code",
      "faction.emoji as emoji",
      "faction_snapshot.rank_change as rank_change",
    ])
    .where("faction_snapshot.batch_id", "=", mostRecentSnapshotBatch.id)
    .orderBy("faction_snapshot.rank")
    .execute();

  const discordClient = await getDiscordClient();
  const channel = await discordClient.channels.fetch(channelId);

  if (!channel || !(channel instanceof TextChannel) || !channel.isSendable) {
    throw new Error(`Discord channel with ID ${channelId} not found or is not text-based.`);
  }

  const introEmbed = new EmbedBuilder()
    .setTitle("Faction Rankings")
    .setDescription(
      "***BEEP BOOP!*** I have eaten the delicious data from all the UK Malifaux rankings and here some yummy faction standings for you to enjoy!\n",
    );

  const factionEmbeds = snapshot.map(
    ({ faction_name, hex_code, rank, total_points, declarations, points_per_declaration, declaration_rate, emoji, rank_change }) => {
      return new EmbedBuilder()
        .setTitle(`${rank}. ${faction_name} ${emoji}`)
        .setColor(hex_code as ColorResolvable)
        .addFields(
          { name: "Declarations", value: declarations.toString(), inline: true },
          { name: "Total Points", value: total_points.toString(), inline: true },
          { name: "Play Rate", value: declaration_rate ? (declaration_rate * 100).toFixed(2) + "%" : "", inline: true },
          {
            name: "Points per Declaration",
            value: points_per_declaration ? `**${points_per_declaration.toFixed(2)}**` : "",
            inline: true,
          },
          { name: "Change", value: formatRankChange(rank_change), inline: true },
        );
    },
  );

  await channel.send({ embeds: [introEmbed, ...factionEmbeds] });
}
