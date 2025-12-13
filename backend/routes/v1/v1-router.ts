import { Router } from "@koa/router";
import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "kysely-codegen";
import { Pool } from "pg";
import { longshanks } from "./v1-routes/longshanks.js";
import z from "zod";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
  // TODO unify and typescript this checking
}

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

  const basicAuth = Buffer.from(
    `${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`
  ).toString("base64");

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: validatedBody.code,
      redirect_uri: "http://localhost:3000/logged-in",
    }),
  });
  if (!tokenResponse.ok) throw new Error("problem getting token");
  const { access_token } = await tokenResponse.json();

  const idResponse = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!idResponse.ok) throw new Error("problem getting user id");
  const userData = await idResponse.json();
  const { id, username, global_name } = userData;

  const { SignJWT } = await import("jose");
  const jwt = await new SignJWT({ id, username, global_name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("1y")
    .sign(new TextEncoder().encode(JWT_SECRET));

  ctx.response.body = { jwt, username, global_name };
});
