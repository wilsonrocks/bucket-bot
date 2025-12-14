import { Router } from "@koa/router";
import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "kysely-codegen";
import { Pool } from "pg";
import { longshanks } from "./v1-routes/longshanks.js";
import z from "zod";
import jsonWebToken from "jsonwebtoken";
import { hasRankingReporterRole } from "./v1-routes/roles.js";

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

const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

async function getRows() {
  const rows = await db.selectFrom("tourney").selectAll().execute();
  return rows;
}

export const v1Router = new Router({ prefix: "/v1" });

v1Router.get("/longshanks", longshanks);
v1Router.get("/has-role", hasRankingReporterRole);

v1Router.get("/tourney", async (ctx) => {
  const rows = await getRows();
  ctx.body = { fakeData: rows };
});

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
