import { Router } from "@koa/router";
import jsonWebToken from "jsonwebtoken";
import z from "zod";
import { newLongshanksEvent } from "./v1-routes/new-longshanks-event";
import { hasRankingReporterRole } from "./v1-routes/roles";

import koaJwt from "koa-jwt";
import { botChatRouter } from "./v1-routes/discord-bot-chat";
import {
  fetchAndStoreDiscordUserIds,
  getAllDiscordUsers,
  matchPlayerToDiscordUser,
  playersWithNoDiscordId,
  searchDiscordUsersByName,
} from "./v1-routes/discord-id";
import { postDiscordRankingsHandler } from "./v1-routes/discord-rankings";
import {
  generateFactionRankingsHandler,
  getFactionRankings,
  postFactionRankingsHandler,
} from "./v1-routes/faction-rankings";
import { generateRankingsHandler } from "./v1-routes/generate-rankings";
import { newBotEventHandler } from "./v1-routes/new-bot-event";
import { getPlayerById, getPlayers } from "./v1-routes/players";
import { rankingTypesHandler } from "./v1-routes/ranking-types";
import { rankingsHandler } from "./v1-routes/rankings";
import { rankingsPlayerHandler } from "./v1-routes/rankings-player";
import { getAllTiers } from "./v1-routes/tiers";
import {
  allTourneys,
  detailTourney,
  getTourneysForPlayerHandler,
  postEventSummaryToDiscord,
  updateTourney,
} from "./v1-routes/tourney";
import { createVenueHandler, getAllVenuesHandler } from "./v1-routes/venues";
import { getUnmappedIdentities } from "./v1-routes/identities";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
  // TODO unify and typescript this checking
}

const DISCORD_REDIRECT_URL = process.env.DISCORD_REDIRECT_URL;
if (!DISCORD_REDIRECT_URL) {
  throw new Error("DISCORD_REDIRECT_URL is not defined");
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_CLIENT_ID) {
  throw new Error("DISCORD_CLIENT_ID is not defined");
}

const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
if (!DISCORD_CLIENT_SECRET) {
  throw new Error("DISCORD_CLIENT_SECRET is not defined");
}

const basicAuth = Buffer.from(
  `${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`,
).toString("base64");

export const v1Router = new Router({ prefix: "/v1" });

const tokenValidator = z.object({ code: z.string() });

v1Router.post("/token", async (ctx) => {
  let validatedBody;
  try {
    validatedBody = tokenValidator.parse(ctx.request.body);
  } catch (e) {
    return ctx.throw(400, "Invalid request body", { cause: e });
  }
  ctx.body = { token: "fakeToken" };

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: validatedBody.code,
      redirect_uri: DISCORD_REDIRECT_URL,
    }),
  });

  if (!tokenResponse.ok) {
    console.error(
      "Discord token response not ok:",
      tokenResponse.statusText,
      JSON.stringify(tokenResponse),
    );
    return ctx.throw(
      502,
      "Error fetching token from Discord",
      tokenResponse.statusText,
      JSON.stringify(tokenResponse),
    );
  }

  const { access_token } = await tokenResponse.json();

  const idResponse = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!idResponse.ok) {
    console.error("Discord token response not ok:", tokenResponse.statusText);

    return ctx.throw(
      502,
      "Error fetching user id from Discord",
      idResponse.statusText,
    );
  }

  const userData = await idResponse.json();
  const { id, username, global_name } = userData;

  const jwt = jsonWebToken.sign({ id, username, global_name }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1y",
  });

  ctx.response.body = { jwt, username, global_name };
});

v1Router.get("/ranking-types", rankingTypesHandler);
v1Router.get("/rankings/:typeCode", rankingsHandler);
v1Router.get("/rankings/:playerId/:typeCode", rankingsPlayerHandler);
v1Router.get("/tourney", allTourneys);
v1Router.get("/tourney/:id", detailTourney);
v1Router.get("/tourneys/player/:playerId", getTourneysForPlayerHandler);
v1Router.get("/venues", getAllVenuesHandler);
v1Router.get("/players", getPlayers);
v1Router.get("/player/:id", getPlayerById);
v1Router.get("/tiers", getAllTiers);
v1Router.get("/faction-rankings", getFactionRankings);

// now these need authentication
v1Router.use(koaJwt({ secret: process.env.JWT_SECRET! }));

v1Router.post("/longshanks-event/:id", newLongshanksEvent);
v1Router.post("/bot-event", newBotEventHandler);

v1Router.get("/has-role", hasRankingReporterRole);
v1Router.post("/generate-rankings", generateRankingsHandler);

v1Router.post("/create-venue", createVenueHandler);

v1Router.post("/fetch-discord-user-ids", fetchAndStoreDiscordUserIds); // THIS is a weird hack because we in a lambda and this rate limits severely
v1Router.get("/search-discord-users", searchDiscordUsersByName);
v1Router.get("/all-discord-users", getAllDiscordUsers);
v1Router.get("/players-with-no-discord-id", playersWithNoDiscordId);
v1Router.post(
  "/match-player-to-discord-user/:playerId/:discordUserId",
  matchPlayerToDiscordUser,
);
v1Router.post("/post-discord-rankings", postDiscordRankingsHandler);
v1Router.post("/post-discord-event/:tourneyId", postEventSummaryToDiscord);
v1Router.post("/tourney", updateTourney);

v1Router.use("/bot-chat", botChatRouter.routes());
v1Router.use("/bot-chat", botChatRouter.allowedMethods());
v1Router.post("/faction-rankings", generateFactionRankingsHandler);

v1Router.post("/post-faction-rankings", postFactionRankingsHandler);

v1Router.get("/unmapped-identities", getUnmappedIdentities);
