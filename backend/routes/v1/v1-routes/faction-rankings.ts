import { Context } from "koa";
import { generateFactionRankings } from "../../../logic/rankings/generate-faction-rankings";
import { ColorResolvable, EmbedBuilder, Emoji, TextChannel } from "discord.js";
import {
  EVENT_ENTHUSIAST_ROLE_ID,
  getDiscordClient,
} from "../../../logic/discord-client";

const { DISCORD_FACTION_CHANNEL_ID, DISCORD_TEST_CHANNEL_ID } = process.env;
if (!DISCORD_FACTION_CHANNEL_ID) {
  throw new Error("DISCORD_FACTION_CHANNEL_ID env var is not set");
}

if (!DISCORD_TEST_CHANNEL_ID) {
  throw new Error("DISCORD_TEST_CHANNEL_ID env var is not set");
}

export const getFactionRankings = async (ctx: Context) => {
  const newestBatch = await ctx.state.db
    .selectFrom("faction_snapshot_batch")
    .select("id")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!newestBatch) {
    ctx.response.body = [];
    return;
  }

  const data = await ctx.state.db
    .selectFrom("faction_snapshot")
    .innerJoin(
      "faction_snapshot_batch",
      "faction_snapshot.batch_id",
      "faction_snapshot_batch.id",
    )
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction_snapshot_batch.created_at as snapshot_date",
      "faction.name as faction_name",
      "faction_snapshot.rank as rank",
      "faction.name_code as faction_code",
      "faction_snapshot.total_points as total_points",
      "faction_snapshot.declarations as declarations",
      "faction_snapshot.points_per_declaration as points_per_declaration",
      "faction.hex_code as hex_code",
    ])
    .where("faction_snapshot.batch_id", "=", newestBatch.id)
    .orderBy("rank")
    .execute();

  ctx.response.body = data;
};

export const generateFactionRankingsHandler = async (ctx: Context) => {
  await generateFactionRankings(ctx.state.db);
  ctx.response.status = 200;
  ctx.response.body = { success: true };
};

export const postFactionRankingsHandler = async (ctx: Context) => {
  const { live: liveQueryParam } = ctx.request.query;
  const isLive = typeof liveQueryParam === "string";

  const channelId = isLive
    ? DISCORD_FACTION_CHANNEL_ID
    : DISCORD_TEST_CHANNEL_ID;

  const mostRecentSnapshotBatch = await ctx.state.db
    .selectFrom("faction_snapshot_batch")
    .select("id")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!mostRecentSnapshotBatch) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: "No faction snapshot batch available.",
    };
    return;
  }

  const snapshot = await ctx.state.db
    .selectFrom("faction_snapshot")
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction.name as faction_name",
      "faction_snapshot.rank as rank",
      "faction_snapshot.total_points as total_points",
      "faction_snapshot.declarations as declarations",
      "faction_snapshot.points_per_declaration as points_per_declaration",
      "faction.hex_code as hex_code",
      "faction.emoji as emoji",
    ])
    .where("faction_snapshot.batch_id", "=", mostRecentSnapshotBatch.id)
    .orderBy("faction_snapshot.rank")
    .execute();

  const discordClient = await getDiscordClient();
  const channel = await discordClient.channels.fetch(channelId);

  if (!channel || !(channel instanceof TextChannel) || !channel.isSendable) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: `Discord channel with ID ${channelId} not found or is not text-based.`,
    };
    return;
  }

  const introEmbed = new EmbedBuilder()
    .setTitle(`Faction Rankings ${snapshot.map((f) => f.emoji).join("")}`)
    .setDescription(
      `***BEEP BOOP!*** I have eaten the delicious data from all the UK Malifaux rankings and here some yummy faction standings for you to enjoy!\n<@&${EVENT_ENTHUSIAST_ROLE_ID}>`,
    );

  const factionEmbeds = snapshot.map(
    ({
      faction_name,
      hex_code,
      rank,
      total_points,
      declarations,
      points_per_declaration,
      emoji,
    }) =>
      new EmbedBuilder()
        .setTitle(`${rank}. ${faction_name} ${emoji}`)
        .setColor(hex_code as ColorResolvable)
        .addFields(
          {
            name: "Points per Declaration",
            value: points_per_declaration
              ? points_per_declaration.toFixed(2)
              : "",
            inline: true,
          },
          {
            name: "Total Points",
            value: total_points.toString(),
            inline: true,
          },
          {
            name: "Declarations",
            value: declarations.toString(),
            inline: true,
          },
        ),
  );

  await channel.send({ embeds: [introEmbed, ...factionEmbeds] });
  ctx.response.status = 200;
  ctx.response.body = { success: true };
};
