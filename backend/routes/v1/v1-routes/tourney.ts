import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql } from "kysely";
import { ColorResolvable, EmbedBuilder } from "discord.js";
import { formatDate } from "date-fns/format";
import type { AppEnv } from "../../../hono-env.js";
import {
  EVENT_ENTHUSIAST_ROLE_ID,
  getDiscordClient,
} from "../../../logic/discord-client.js";

const ErrorSchema = z.object({ error: z.string() });

const TourneyListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  date: z.string().nullable(),
  venue: z.string().nullable(),
  tier_code: z.string().nullable(),
  players: z.number(),
  longshanks_id: z.string().nullable(),
});

export const allTourneysRoute = createRoute({
  method: "get",
  path: "/tourney",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TourneyListItemSchema) } },
      description: "List of all tournaments",
    },
  },
});

export const allTourneys: RouteHandler<typeof allTourneysRoute, AppEnv> = async (c) => {
  const db = c.get("db");
  const results = await db
    .selectFrom("tourney")
    .innerJoin("result", "tourney.id", "result.tourney_id")
    .select([
      "tourney.id",
      "tourney.name",
      "tourney.date",
      "tourney.venue",
      "tourney.tier_code",
      db.fn.count("result.id").as("players"),
      "tourney.longshanks_id",
    ])
    .groupBy(["tourney.id"])
    .orderBy("tourney.date", "desc")
    .execute();

  return c.json(
    results.map((event) => ({ ...event, players: parseInt(event.players as string) })) as any,
    200,
  );
};

export const detailTourneyRoute = createRoute({
  method: "get",
  path: "/tourney/:id",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            players: z.array(z.object({}).passthrough()),
            tourney: z.object({}).passthrough(),
            paintingCategories: z.array(z.object({}).passthrough()),
          }),
        },
      },
      description: "Tournament details",
    },
  },
});

export const detailTourney: RouteHandler<typeof detailTourneyRoute, AppEnv> = async (c) => {
  const { id } = c.req.valid("param");
  const db = c.get("db");

  const playerDataPromise = db
    .selectFrom("tourney")
    .innerJoin("result", "tourney.id", "result.tourney_id")
    .innerJoin("player_identity", "player_identity.id", "result.player_identity_id")
    .leftJoin("player", "player_identity.player_id", "player.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("tourney.id", "=", Number(id))
    .select([
      "player.id as playerId",
      "faction.name as factionName",
      sql<string>`coalesce(${sql.ref("player.name")}, ${sql.ref("player_identity.provider_name")})`.as("playerName"),
      "result.place",
      "result.points",
      "faction.hex_code as factionHexCode",
    ])
    .orderBy("result.place", "asc")
    .execute();

  const tourneyInfoPromise = db
    .selectFrom("tourney")
    .where("tourney.id", "=", Number(id))
    .selectAll()
    .executeTakeFirstOrThrow();

  const paintingCategoriesPromise = db
    .selectFrom("painting_category")
    .innerJoin("painting_winner", "painting_category.id", "painting_winner.category_id")
    .where("tourney_id", "=", Number(id))
    .execute();

  const [players, tourney, paintingCategories] = await Promise.all([
    playerDataPromise,
    tourneyInfoPromise,
    paintingCategoriesPromise,
  ]);

  const formattedPaintingCategories = paintingCategories.reduce(
    (acc: any[], row: any) => {
      let category = acc.find((cat) => cat.name === row.name);
      if (!category) {
        category = { name: row.name, winners: [] };
        acc.push(category);
      }
      category.winners.push({ player_id: row.player_id, position: row.position, model: row.model });
      return acc;
    },
    [],
  );

  return c.json({ players, tourney, paintingCategories: formattedPaintingCategories } as any, 200);
};

export const getTourneysForPlayerRoute = createRoute({
  method: "get",
  path: "/tourneys/player/:playerId",
  request: {
    params: z.object({ playerId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.object({}).passthrough()) } },
      description: "Tournaments for a player",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid player ID",
    },
  },
});

export const getTourneysForPlayerHandler: RouteHandler<typeof getTourneysForPlayerRoute, AppEnv> = async (c) => {
  const { playerId } = c.req.valid("param");
  const playerIdNum = Number(playerId);
  if (isNaN(playerIdNum)) {
    return c.json({ error: "Invalid player ID" }, 400);
  }

  const results = await c.get("db")
    .selectFrom("result")
    .innerJoin("tourney", "result.tourney_id", "tourney.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .innerJoin("player_identity", "result.player_identity_id", "player_identity.id")
    .innerJoin("player", "player_identity.player_id", "player.id")
    .where("player_identity.player_id", "=", playerIdNum)
    .select([
      "tourney.id as tourneyId",
      "tourney.name as tourneyName",
      "tourney.date as tourneyDate",
      "tourney.venue as tourneyVenue",
      "tourney.tier_code as tourneyTierCode",
      "result.place as place",
      "result.points as points",
      "faction.name as factionName",
      "tourney.date as date",
      "player.discord_id as discordId",
    ])
    .orderBy("tourney.date", "desc")
    .execute();

  return c.json(results as any, 200);
};

const TourneyUpdateBodySchema = z.object({
  id: z.number(),
  organiserDiscordId: z.string().optional(),
  venueId: z.number().optional(),
  name: z.string(),
  rounds: z.number().int().min(1),
  days: z.number().int().min(1),
  tierCode: z.string(),
});

export const updateTourneyRoute = createRoute({
  method: "post",
  path: "/tourney",
  request: {
    body: {
      content: { "application/json": { schema: TourneyUpdateBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
      description: "Tournament updated",
    },
  },
});

export const updateTourney: RouteHandler<typeof updateTourneyRoute, AppEnv> = async (c) => {
  const body = c.req.valid("json");

  await c.get("db").transaction().execute(async (trx) => {
    await trx
      .updateTable("tourney")
      .set({
        name: body.name,
        organiser_discord_id: body.organiserDiscordId ?? null,
        venue_id: body.venueId ?? null,
        rounds: body.rounds,
        days: body.days,
        tier_code: body.tierCode,
      })
      .where("id", "=", body.id)
      .execute();
  });

  return c.json({ message: "success" }, 200);
};

export const postEventSummaryToDiscordRoute = createRoute({
  method: "post",
  path: "/post-discord-event/:tourneyId",
  request: {
    params: z.object({ tourneyId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ discord_post_id: z.string() }) } },
      description: "Event summary posted to Discord",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid tourney ID",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Discord channel error",
    },
  },
});

export const postEventSummaryToDiscord: RouteHandler<typeof postEventSummaryToDiscordRoute, AppEnv> = async (c) => {
  const { tourneyId } = c.req.valid("param");
  const tourneyIdNum = Number(tourneyId);

  if (isNaN(tourneyIdNum)) {
    return c.json({ error: "Invalid tourney ID" }, 400);
  }

  const db = c.get("db");
  const discordClient = await getDiscordClient();

  const tourneyData = await db
    .selectFrom("tourney")
    .where("tourney.id", "=", tourneyIdNum)
    .innerJoin("venue", "tourney.venue_id", "venue.id")
    .select([
      "tourney.name as tourneyName",
      "venue.name as venueName",
      "venue.town as venueTown",
      "tourney.organiser_discord_id as organiserDiscordId",
      "tourney.date as tourneyDate",
    ])
    .executeTakeFirstOrThrow();

  const resultsTableData = await db
    .selectFrom("result")
    .where("result.tourney_id", "=", tourneyIdNum)
    .innerJoin("player_identity", "result.player_identity_id", "player_identity.id")
    .leftJoin("player", "player_identity.player_id", "player.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .select([
      sql<string>`coalesce(${sql.ref("player.name")}, ${sql.ref("player_identity.provider_name")})`.as("playerName"),
      "player.discord_id as discord_id",
      "result.place as place",
      "result.points as points",
      "faction.name as factionName",
    ])
    .orderBy("result.place", "asc")
    .execute();

  const topPlayersSubquery = db
    .selectFrom("result")
    .innerJoin("player_identity", "result.player_identity_id", "player_identity.id")
    .where("result.tourney_id", "=", tourneyIdNum)
    .select([
      "player_identity.id",
      "result.faction_code",
      "result.points",
      sql<number>`ROW_NUMBER() OVER (PARTITION BY result.faction_code ORDER BY result.points DESC)`.as("rn"),
    ])
    .as("top_players");

  const factionTotalsSubquery = db
    .selectFrom("result as r")
    .where("r.tourney_id", "=", tourneyIdNum)
    .select([
      "r.faction_code",
      sql<number>`COUNT(*)`.as("player_count"),
      sql<number>`SUM(r.points)`.as("total_ranking_points"),
    ])
    .groupBy("r.faction_code")
    .as("faction_totals");

  const factionSummary = await db
    .selectFrom(topPlayersSubquery)
    .innerJoin(factionTotalsSubquery, "top_players.faction_code", "faction_totals.faction_code")
    .innerJoin("player_identity", "top_players.id", "player_identity.id")
    .leftJoin("player", "player_identity.player_id", "player.id")
    .leftJoin("faction", "top_players.faction_code", "faction.name_code")
    .where("top_players.rn", "=", 1)
    .select([
      "player.discord_id",
      sql<string>`coalesce(${sql.ref("player.name")}, ${sql.ref("player_identity.provider_name")})`.as("player_name"),
      "faction.name as faction_name",
      "top_players.points as top_points",
      "faction_totals.player_count",
      "faction_totals.total_ranking_points",
      "faction.emoji as emoji",
      "faction.hex_code as hex_code",
    ])
    .orderBy("faction.name", "asc")
    .execute();

  const totals = await db
    .selectFrom("result")
    .innerJoin("player_identity", "result.player_identity_id", "player_identity.id")
    .select((eb) => [
      eb.fn.sum("rounds_played").as("games_played"),
      sql`COUNT(DISTINCT tourney_id)`.as("total_events"),
      sql`COUNT(DISTINCT player_identity.player_id)`.as("total_players"),
    ])
    .executeTakeFirstOrThrow();

  const channelId = process.env.DISCORD_EVENTS_CHANNEL_ID;
  if (!channelId) {
    return c.json({ error: "Discord events channel ID not configured" }, 500);
  }
  const channel = await discordClient.channels.fetch(channelId);

  if (!channel || !channel.isTextBased() || !channel.isSendable()) {
    return c.json({ error: "Discord events channel not found or not text-based" }, 500);
  }

  const introEmbed = new EmbedBuilder()
    .setTitle(`${tourneyData.tourneyName}`)
    .setDescription(
      `I have eaten the data for the **${tourneyData.tourneyName}** event in ${tourneyData.venueTown} on ${formatDate(tourneyData.tourneyDate, "EEEE, d MMMM yyyy")}.\n\nI can confirm that it was delicious!\n\nShout out to <@${tourneyData.organiserDiscordId}> for organising it! ❤️`,
    )
    .addFields({
      name: "Results",
      value: resultsTableData
        .map((r) => `#${r.place} - ${r.playerName} (${r.factionName}) - ${r.points.toFixed(2)} pts`)
        .join("\n"),
    });

  const factionEmbeds = factionSummary.map((faction) =>
    new EmbedBuilder()
      .setTitle(`${faction.emoji} ${faction.faction_name}`)
      .setColor(faction.hex_code as ColorResolvable)
      .addFields(
        { name: "Players", value: faction.player_count.toString(), inline: true },
        { name: "Total Ranking Points", value: faction.total_ranking_points.toFixed(2), inline: true },
        { name: "Best Player", value: faction.player_name, inline: true },
      ),
  );

  const communityEmbed = new EmbedBuilder()
    .setTitle("Community Stats")
    .setDescription(
      `***BEEP BOOP!***\n\n**${totals.total_players}** people have played **${totals.games_played}** games at **${totals.total_events}** event${totals.total_events == 1 ? "" : "s"} so far! This is really good, let's make it more! 🚀 🤖 🪣`,
    );

  const sentMessage = await channel.send({
    content: `***BEEP BOOP!*** <@&${EVENT_ENTHUSIAST_ROLE_ID}>\n`,
    embeds: [introEmbed, ...factionEmbeds, communityEmbed],
  });

  await db
    .updateTable("tourney")
    .set({ discord_post_id: sentMessage.url })
    .where("id", "=", tourneyIdNum)
    .execute();

  return c.json({ discord_post_id: sentMessage.url }, 200);
};
