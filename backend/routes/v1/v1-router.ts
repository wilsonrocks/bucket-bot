import { Router } from "@koa/router";
import jsonWebToken from "jsonwebtoken";
import z from "zod";
import { newLongshanksEvent } from "./v1-routes/new-longshanks-event.js";
import { hasRankingReporterRole } from "./v1-routes/roles.js";

import { DefaultContext } from "koa";
import koaJwt from "koa-jwt";
import { allTourneys, detailTourney } from "./v1-routes/tourney.js";
import { generate } from "kysely-codegen";
import { generateRankingsHandler } from "./v1-routes/generate-rankings.js";

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
  `${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`
).toString("base64");

async function getRows(ctx: DefaultContext) {
  const rows = await ctx.state.db.selectFrom("tourney").selectAll().execute();
  return rows;
}

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
      JSON.stringify(tokenResponse)
    );
    return ctx.throw(
      502,
      "Error fetching token from Discord",
      tokenResponse.statusText,
      JSON.stringify(tokenResponse)
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
      idResponse.statusText
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

// now these need authentication
v1Router.use(koaJwt({ secret: process.env.JWT_SECRET! }));

v1Router.post("/longshanks-event/:id", newLongshanksEvent);
v1Router.get("/has-role", hasRankingReporterRole);
v1Router.get("/tourney", allTourneys);
v1Router.get("/tourney/:id", detailTourney);
v1Router.post("/generate-rankings", generateRankingsHandler);
