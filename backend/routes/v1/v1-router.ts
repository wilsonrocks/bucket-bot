import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { jwt } from "hono/jwt";
import jsonWebToken from "jsonwebtoken";
import type { AppEnv } from "../../hono-env.js";
import { botChatRouter } from "./v1-routes/discord-bot-chat.js";
import {
  fetchAndStoreDiscordUserIds,
  fetchDiscordUserIdsRoute,
  getAllDiscordUsers,
  getAllDiscordUsersRoute,
  matchPlayerToDiscordUser,
  matchPlayerToDiscordUserRoute,
  searchDiscordUsersByName,
  searchDiscordUsersRoute,
} from "./v1-routes/discord-id.js";
import {
  postDiscordRankingsHandler,
  postDiscordRankingsRoute,
} from "./v1-routes/discord-rankings.js";
import {
  generateFactionRankingsHandler,
  generateFactionRankingsRoute,
  getFactionRankings,
  getFactionRankingsRoute,
  postFactionRankingsHandler,
  postFactionRankingsRoute,
} from "./v1-routes/faction-rankings.js";
import {
  generateRankingsHandler,
  generateRankingsRoute,
} from "./v1-routes/generate-rankings.js";
import {
  getUnmappedIdentities,
  getUnmappedIdentitiesRoute,
} from "./v1-routes/identities.js";
import {
  newBotEventHandler,
  newBotEventRoute,
} from "./v1-routes/new-bot-event.js";
import {
  newLongshanksEvent,
  newLongshanksEventRoute,
} from "./v1-routes/new-longshanks-event.js";
import {
  getPlayerById,
  getPlayerByIdRoute,
  getPlayerTeams,
  getPlayerTeamsRoute,
  getPlayers,
  getPlayersRoute,
  playerNameExistsHandler,
  playerNameExistsRoute,
  updatePlayer,
  updatePlayerRoute,
} from "./v1-routes/players.js";
import {
  rankingTypesHandler,
  rankingTypesRoute,
} from "./v1-routes/ranking-types.js";
import { rankingsHandler, rankingsRoute } from "./v1-routes/rankings.js";
import {
  rankingsPlayerHandler,
  rankingsPlayerRoute,
} from "./v1-routes/rankings-player.js";
import {
  hasRankingReporterRole,
  hasRankingReporterRoleRoute,
} from "./v1-routes/roles.js";
import { getAllTiers, getAllTiersRoute } from "./v1-routes/tiers.js";
import {
  allTourneys,
  allTourneysRoute,
  detailTourney,
  detailTourneyRoute,
  getTourneysForPlayerHandler,
  getTourneysForPlayerRoute,
  postEventSummaryToDiscord,
  postEventSummaryToDiscordRoute,
  updateTourney,
  updateTourneyRoute,
} from "./v1-routes/tourney.js";
import {
  createVenueHandler,
  createVenueRoute,
  getAllVenuesHandler,
  getAllVenuesRoute,
  reGeocodeVenueHandler,
  reGeocodeVenueRoute,
} from "./v1-routes/venues.js";
import {
  getFactionsOverTime,
  getFactionsOverTimeRoute,
} from "./v1-routes/factions-over-time.js";
import {
  getPlayersOverTime,
  getPlayersOverTimeRoute,
} from "./v1-routes/players-over-time.js";
import {
  getRegionEventCountsHandler,
  getRegionEventCountsRoute,
} from "./v1-routes/regions.js";
import {
  createTeamHandler,
  createTeamRoute,
  deleteTeamHandler,
  deleteTeamRoute,
  getTeamByIdHandler,
  getTeamByIdRoute,
  getTeamsHandler,
  getTeamsRoute,
  updateTeamHandler,
  updateTeamRoute,
} from "./v1-routes/teams";
import {
  addTeamMemberHandler,
  addTeamMemberRoute,
  removeTeamMemberHandler,
  removeTeamMemberRoute,
  updateTeamMemberHandler,
  updateTeamMemberRoute,
} from "./v1-routes/team-memberships";
import { uploadHandler, uploadRoute } from "./v1-routes/upload";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

const DISCORD_REDIRECT_URL = process.env.DISCORD_REDIRECT_URL;
if (!DISCORD_REDIRECT_URL)
  throw new Error("DISCORD_REDIRECT_URL is not defined");

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_CLIENT_ID) throw new Error("DISCORD_CLIENT_ID is not defined");

const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
if (!DISCORD_CLIENT_SECRET)
  throw new Error("DISCORD_CLIENT_SECRET is not defined");

const basicAuth = Buffer.from(
  `${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`,
).toString("base64");

export const v1Router = new OpenAPIHono<AppEnv>();

v1Router.doc("/doc", {
  openapi: "3.0.0",
  info: { title: "Bucket Bot API", version: "1.0.0" },
});
v1Router.get("/ui", swaggerUI({ url: "/v1/doc" }));

// ── Token (Discord OAuth) ──────────────────────────────────────────────────

const tokenBodySchema = z.object({ code: z.string() });
const tokenResponseSchema = z.object({
  jwt: z.string(),
  username: z.string(),
  global_name: z.string(),
});
const tokenRoute = createRoute({
  method: "post",
  path: "/token",
  request: {
    body: { content: { "application/json": { schema: tokenBodySchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: tokenResponseSchema } },
      description: "JWT token for authenticated user",
    },
    400: {
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
      description: "Invalid request",
    },
    502: {
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
      description: "Discord API error",
    },
  },
});

v1Router.openapi(tokenRoute, async (c) => {
  const { code } = c.req.valid("json");

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: DISCORD_REDIRECT_URL!,
    }),
  });

  if (!tokenResponse.ok) {
    console.error("Discord token response not ok:", tokenResponse.statusText);
    return c.json({ error: "Error fetching token from Discord" }, 502);
  }

  const { access_token } = await tokenResponse.json();

  const idResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!idResponse.ok) {
    console.error("Discord id response not ok:", idResponse.statusText);
    return c.json({ error: "Error fetching user id from Discord" }, 502);
  }

  const { id, username, global_name } = await idResponse.json();

  const jwtToken = jsonWebToken.sign(
    { id, username, global_name },
    JWT_SECRET!,
    {
      algorithm: "HS256",
      expiresIn: "1y",
    },
  );

  return c.json({ jwt: jwtToken, username, global_name }, 200);
});

// ── Public routes ──────────────────────────────────────────────────────────

v1Router.openapi(rankingTypesRoute, rankingTypesHandler);
v1Router.openapi(rankingsRoute, rankingsHandler);
v1Router.openapi(rankingsPlayerRoute, rankingsPlayerHandler);
v1Router.openapi(allTourneysRoute, allTourneys);
v1Router.openapi(detailTourneyRoute, detailTourney);
v1Router.openapi(getTourneysForPlayerRoute, getTourneysForPlayerHandler);
v1Router.openapi(getAllVenuesRoute, getAllVenuesHandler);
v1Router.openapi(getRegionEventCountsRoute, getRegionEventCountsHandler);
v1Router.openapi(getPlayersRoute, getPlayers);
v1Router.openapi(getPlayerByIdRoute, getPlayerById);
v1Router.openapi(getPlayerTeamsRoute, getPlayerTeams);
v1Router.openapi(getAllTiersRoute, getAllTiers);
v1Router.openapi(getFactionRankingsRoute, getFactionRankings);
v1Router.openapi(getFactionsOverTimeRoute, getFactionsOverTime);
v1Router.openapi(getPlayersOverTimeRoute, getPlayersOverTime);
v1Router.openapi(getUnmappedIdentitiesRoute, getUnmappedIdentities);
v1Router.openapi(getTeamsRoute, getTeamsHandler);
v1Router.openapi(getTeamByIdRoute, getTeamByIdHandler);

// ── JWT middleware (all routes below require authentication) ───────────────

v1Router.use("*", jwt({ secret: JWT_SECRET!, alg: "HS256" }));

// ── Protected routes ───────────────────────────────────────────────────────

v1Router.openapi(newLongshanksEventRoute, newLongshanksEvent);
v1Router.openapi(newBotEventRoute, newBotEventHandler);
v1Router.openapi(hasRankingReporterRoleRoute, hasRankingReporterRole);
v1Router.openapi(generateRankingsRoute, generateRankingsHandler);
v1Router.openapi(createVenueRoute, createVenueHandler);
v1Router.openapi(reGeocodeVenueRoute, reGeocodeVenueHandler);
v1Router.openapi(fetchDiscordUserIdsRoute, fetchAndStoreDiscordUserIds);
v1Router.openapi(searchDiscordUsersRoute, searchDiscordUsersByName);
v1Router.openapi(getAllDiscordUsersRoute, getAllDiscordUsers);
v1Router.openapi(matchPlayerToDiscordUserRoute, matchPlayerToDiscordUser);
v1Router.openapi(postDiscordRankingsRoute, postDiscordRankingsHandler);
v1Router.openapi(postEventSummaryToDiscordRoute, postEventSummaryToDiscord);
v1Router.openapi(updateTourneyRoute, updateTourney);
v1Router.route("/bot-chat", botChatRouter);
v1Router.openapi(generateFactionRankingsRoute, generateFactionRankingsHandler);
v1Router.openapi(postFactionRankingsRoute, postFactionRankingsHandler);
v1Router.openapi(uploadRoute, uploadHandler);
v1Router.openapi(createTeamRoute, createTeamHandler);
v1Router.openapi(updateTeamRoute, updateTeamHandler);
v1Router.openapi(deleteTeamRoute, deleteTeamHandler);
v1Router.openapi(addTeamMemberRoute, addTeamMemberHandler);
v1Router.openapi(updateTeamMemberRoute, updateTeamMemberHandler);
v1Router.openapi(removeTeamMemberRoute, removeTeamMemberHandler);
v1Router.openapi(updatePlayerRoute, updatePlayer);
v1Router.openapi(playerNameExistsRoute, playerNameExistsHandler);
