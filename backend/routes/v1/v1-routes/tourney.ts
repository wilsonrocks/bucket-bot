import { Context } from "koa";
import z, { ZodError } from "zod";
import { getDiscordClient } from "../../../logic/discord-client";
import { EmbedBuilder } from "discord.js";
import { formatDate } from "date-fns/format";
import { mentionIfPossible } from "../../../logic/discord/post-rankings";
import { sql } from "kysely";

export const allTourneys = async (ctx: Context) => {
  const results = await ctx.state.db
    .selectFrom("tourney")
    .innerJoin("result", "tourney.id", "result.tourney_id")
    .select([
      "tourney.id",
      "tourney.name",
      "tourney.date",
      "tourney.venue",
      "tourney.tier_code",

      ctx.state.db.fn.count("result.id").as("players"),
      "tourney.longshanks_id",
    ])
    .groupBy(["tourney.id"])
    .orderBy("tourney.date", "desc")
    .execute();

  ctx.response.body = results.map((event) => {
    return {
      ...event,
      players: parseInt(event.players as string),
    };
  });
};

export const detailTourney = async (ctx: Context) => {
  const playerDataPromise = ctx.state.db
    .selectFrom("tourney")
    .innerJoin("result", "tourney.id", "result.tourney_id")
    .innerJoin("player", "result.player_id", "player.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("tourney.id", "=", ctx.params.id)
    .select([
      "player.id as playerId",
      "faction.name as factionName",
      "player.name as playerName",
      "result.place",
      "result.points",
      "faction.hex_code as factionHexCode",
    ])
    .orderBy("result.place", "asc")
    .execute();

  const tourneyInfoPromise = ctx.state.db
    .selectFrom("tourney")
    .where("tourney.id", "=", ctx.params.id)
    .selectAll()
    .executeTakeFirstOrThrow();

  const paintingCategoriesPromise = ctx.state.db
    .selectFrom("painting_category")
    .innerJoin(
      "painting_winner",
      "painting_category.id",
      "painting_winner.category_id",
    )
    .where("tourney_id", "=", ctx.params.id)
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
      category.winners.push({
        player_id: row.player_id,
        position: row.position,
        model: row.model,
      });
      return acc;
    },
    [],
  );

  ctx.response.body = {
    players,
    tourney,
    paintingCategories: formattedPaintingCategories,
  };
};

export const getTourneysForPlayerHandler = async (ctx: Context) => {
  const playerId = Number(ctx.params.playerId);
  if (!playerId || isNaN(playerId)) {
    ctx.throw(400, "Invalid player ID");
  }

  const results = await ctx.state.db
    .selectFrom("result")
    .innerJoin("tourney", "result.tourney_id", "tourney.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("result.player_id", "=", playerId)
    // @ts-ignore
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

  ctx.response.body = results;
};

const tourneyUpdateValidator = z.object({
  id: z.number(),
  organiserDiscordId: z.string().optional(),
  venueId: z.number().optional(),
  name: z.string(),
  rounds: z.number().int().min(1),
  days: z.number().int().min(1),
  tierCode: z.string(),
});

export const updateTourney = async (ctx: Context) => {
  console.log(ctx.request.body);
  let validatedParams;
  try {
    validatedParams = tourneyUpdateValidator.parse(ctx.request.body);
  } catch (error) {
    console.log(error);
    ctx.throw(400, (error as any as ZodError).message);
  }

  await ctx.state.db.transaction().execute(async (trx) => {
    const { id: tourneyId } = validatedParams;
    console.table(validatedParams);
    await trx
      .updateTable("tourney")
      .set({
        name: validatedParams.name,
        organiser_discord_id: validatedParams.organiserDiscordId || null,
        venue_id: validatedParams.venueId || null,
        rounds: validatedParams.rounds,
        days: validatedParams.days,
        tier_code: validatedParams.tierCode,
      })
      .where("id", "=", tourneyId)
      .execute();
  });

  ctx.response.body = { message: "success" };
};

export const postEventSummaryToDiscord = async (ctx: Context) => {
  const discordClient = await getDiscordClient();
  const tourneyId = Number(ctx.params.tourneyId);

  if (!tourneyId || isNaN(tourneyId)) {
    ctx.throw(400, "Invalid tourney ID");
  }

  const tourneyData = await ctx.state.db
    .selectFrom("tourney")
    .where("tourney.id", "=", tourneyId)
    .innerJoin("venue", "tourney.venue_id", "venue.id")
    .select([
      "tourney.name as tourneyName",
      "venue.name as venueName",
      "venue.town as venueTown",
      "tourney.organiser_discord_id as organiserDiscordId",
      "tourney.date as tourneyDate",
    ])
    .executeTakeFirstOrThrow();

  const resultsTableData = await ctx.state.db
    .selectFrom("result")
    .where("result.tourney_id", "=", tourneyId)
    .innerJoin("player", "result.player_id", "player.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .select([
      "player.name as playerName",
      "player.discord_id as discord_id",
      "result.place as place",
      "result.points as points",
      "faction.name as factionName",
    ])
    .orderBy("result.place", "asc")
    .execute();

  // Step 1: Get top player per faction using ROW_NUMBER
  const topPlayersSubquery = ctx.state.db
    .selectFrom("result as r")
    .where("r.tourney_id", "=", tourneyId)
    .select([
      "r.player_id",
      "r.faction_code",
      "r.points",
      sql<number>`ROW_NUMBER() OVER (PARTITION BY r.faction_code ORDER BY r.points DESC)`.as(
        "rn",
      ),
    ])
    .as("top_players");

  // Step 2: Get total points and player count per faction
  const factionTotalsSubquery = ctx.state.db
    .selectFrom("result as r")
    .where("r.tourney_id", "=", tourneyId)
    .select([
      "r.faction_code",
      sql<number>`COUNT(*)`.as("player_count"),
      sql<number>`SUM(r.points)`.as("total_ranking_points"),
    ])
    .groupBy("r.faction_code")
    .as("faction_totals");

  // Step 3: Join top player + faction totals + faction name
  const factionSummary = await ctx.state.db
    .selectFrom(topPlayersSubquery)
    .innerJoin(
      factionTotalsSubquery,
      "top_players.faction_code",
      "faction_totals.faction_code",
    )
    .innerJoin("player", "top_players.player_id", "player.id")
    .leftJoin("faction as f", "top_players.faction_code", "f.name_code")
    .where("top_players.rn", "=", 1)
    .select([
      "player.discord_id",
      "player.name as player_name",
      "f.name as faction_name",
      "top_players.points as top_points",
      "faction_totals.player_count",
      "faction_totals.total_ranking_points",
    ])
    .orderBy("total_ranking_points", "desc")
    .execute();

  const totals = await ctx.state.db
    .selectFrom("result")
    .select((eb) => [
      eb.fn.sum("rounds_played").as("games_played"),
      sql`COUNT(DISTINCT tourney_id)`.as("total_events"),
      sql`COUNT(DISTINCT player_id)`.as("total_players"),
    ])
    .where("tourney_id", "=", tourneyId)
    .executeTakeFirstOrThrow();

  const channelId = process.env.DISCORD_EVENTS_CHANNEL_ID;
  if (!channelId) {
    ctx.throw(500, "Discord events channel ID not configured");
  }
  const channel = await discordClient.channels.fetch(channelId);

  if (!channel || !channel.isTextBased() || !channel.isSendable()) {
    ctx.throw(500, "Discord events channel not found or not text-based");
  }

  const embed = new EmbedBuilder()
    .setTitle(`${tourneyData.tourneyName}`)
    .setDescription(
      `***BEEP BOOP!***
      I have eaten the data for the **${tourneyData.tourneyName}** event in ${
        tourneyData.venueTown
      } on ${formatDate(tourneyData.tourneyDate, "EEEE, d MMMM yyyy")}.
  
  I can confirm that it was delicious!
  
  Shout out to <@${tourneyData.organiserDiscordId}> for organising it! ❤️ `,
    )
    .addFields(
      {
        name: "Results",
        value: resultsTableData
          .map(
            (r) =>
              `#${r.place} - ${mentionIfPossible({
                discord_user_id: r.discord_id,
                name: r.playerName,
              })} (${r.factionName}) - ${r.points.toFixed(2)} pts`,
          )
          .join("\n"),
      },
      // { name: "Painting", value: "Painting stuff" }
    );

  for (const faction of factionSummary) {
    embed.addFields({
      // @ts-ignore
      name: faction.faction_name,
      value: `- ${faction.player_count} player${
        faction.player_count == 1 ? "" : "s"
      }
- ${faction.total_ranking_points.toFixed(2)} points
- Best player ${mentionIfPossible({
        discord_user_id: faction.discord_id,
        name: faction.player_name,
      })}${faction.player_count == 1 ? "(DEFAULT)" : ""}
      `,
    });
  }

  embed.addFields({
    name: "Community Stats",
    value: `***BEEP BOOP!***\n
    **${totals.total_players}** people have played **${
      totals.games_played
    }** games at **${totals.total_events}** event${
      totals.total_events == 1 ? "" : "s"
    } so far! This is really good, let's make it more! 🚀 🤖 🪣`,
  });

  const sentMessage = await channel.send({ embeds: [embed] });

  await ctx.state.db
    .updateTable("tourney")
    .set({ discord_post_id: sentMessage.url })
    .where("id", "=", tourneyId)
    .execute();
  ctx.response.body = { discord_post_id: sentMessage.url };
};
