import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { ColorResolvable, EmbedBuilder, TextChannel } from "discord.js";
import type { AppEnv } from "../../../hono-env.js";
import { getDiscordClient } from "../../../logic/discord-client.js";
import { generateFactionRankings } from "../../../logic/rankings/generate-faction-rankings.js";

const { DISCORD_FACTION_CHANNEL_ID, DISCORD_TEST_CHANNEL_ID } = process.env;
if (!DISCORD_FACTION_CHANNEL_ID) {
  throw new Error("DISCORD_FACTION_CHANNEL_ID env var is not set");
}
if (!DISCORD_TEST_CHANNEL_ID) {
  throw new Error("DISCORD_TEST_CHANNEL_ID env var is not set");
}

const FactionRankingSchema = z.object({
  snapshot_date: z.string().nullable(),
  faction_name: z.string(),
  rank: z.number().nullable(),
  faction_code: z.string(),
  total_points: z.number().nullable(),
  declarations: z.number().nullable(),
  declaration_rate: z.number().nullable(),
  points_per_declaration: z.number().nullable(),
  hex_code: z.string(),
});

const ErrorSchema = z.object({ error: z.string() });

export const getFactionRankingsRoute = createRoute({
  method: "get",
  path: "/faction-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(FactionRankingSchema) } },
      description: "Current faction rankings",
    },
  },
});

export const getFactionRankings: RouteHandler<typeof getFactionRankingsRoute, AppEnv> = async (c) => {
  const db = c.get("db");
  const newestBatch = await db
    .selectFrom("faction_snapshot_batch")
    .select("id")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!newestBatch) {
    return c.json([], 200);
  }

  const data = await db
    .selectFrom("faction_snapshot")
    .innerJoin("faction_snapshot_batch", "faction_snapshot.batch_id", "faction_snapshot_batch.id")
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction_snapshot_batch.created_at as snapshot_date",
      "faction.name as faction_name",
      "faction_snapshot.rank as rank",
      "faction.name_code as faction_code",
      "faction_snapshot.total_points as total_points",
      "faction_snapshot.declarations as declarations",
      "faction_snapshot.declaration_rate as declaration_rate",
      "faction_snapshot.points_per_declaration as points_per_declaration",
      "faction.hex_code as hex_code",
    ])
    .where("faction_snapshot.batch_id", "=", newestBatch.id)
    .orderBy("rank")
    .execute();

  return c.json(data as any, 200);
};

export const generateFactionRankingsRoute = createRoute({
  method: "post",
  path: "/faction-rankings",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.boolean() }) } },
      description: "Faction rankings generated",
    },
  },
});

export const generateFactionRankingsHandler: RouteHandler<typeof generateFactionRankingsRoute, AppEnv> = async (c) => {
  await generateFactionRankings(c.get("db"));
  return c.json({ success: true }, 200);
};

export const postFactionRankingsRoute = createRoute({
  method: "post",
  path: "/post-faction-rankings",
  request: {
    query: z.object({ live: z.string().optional() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.literal(true) }) } },
      description: "Faction rankings posted to Discord",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), message: z.string() }),
        },
      },
      description: "No faction snapshot available",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), message: z.string() }),
        },
      },
      description: "Discord channel error",
    },
  },
});

export const postFactionRankingsHandler: RouteHandler<typeof postFactionRankingsRoute, AppEnv> = async (c) => {
  const { live } = c.req.valid("query");
  const isLive = live !== undefined;
  const channelId = isLive ? DISCORD_FACTION_CHANNEL_ID! : DISCORD_TEST_CHANNEL_ID!;

  const db = c.get("db");
  const mostRecentSnapshotBatch = await db
    .selectFrom("faction_snapshot_batch")
    .select("id")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!mostRecentSnapshotBatch) {
    return c.json({ success: false as const, message: "No faction snapshot batch available." }, 400);
  }

  const snapshot = await db
    .selectFrom("faction_snapshot")
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction.name as faction_name",
      "faction_snapshot.rank as rank",
      "faction_snapshot.total_points as total_points",
      "faction_snapshot.declarations as declarations",
      "faction_snapshot.declaration_rate as declaration_rate",
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
    return c.json(
      { success: false as const, message: `Discord channel with ID ${channelId} not found or is not text-based.` },
      500,
    );
  }

  const introEmbed = new EmbedBuilder()
    .setTitle("Faction Rankings")
    .setDescription(
      "***BEEP BOOP!*** I have eaten the delicious data from all the UK Malifaux rankings and here some yummy faction standings for you to enjoy!\n",
    );

  const factionEmbeds = snapshot.map(
    ({ faction_name, hex_code, rank, total_points, declarations, points_per_declaration, declaration_rate, emoji }) =>
      new EmbedBuilder()
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
        ),
  );

  await channel.send({ embeds: [introEmbed, ...factionEmbeds] });
  return c.json({ success: true as const }, 200);
};
