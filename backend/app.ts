import cors from "@koa/cors";
import Router from "@koa/router";
import { SignJWT } from "jose";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";
import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "kysely-codegen";
import { Pool } from "pg";

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

const app = new Koa();
app.use(logger());
app.use(cors());
app.use(bodyParser());
const router = new Router({ prefix: "/v1" });

router.get("/tourney", async (ctx) => {
  const rows = await getRows();
  ctx.body = { fakeData: rows };
});

router.post("/token", async (ctx) => {
  console.log(ctx.request.body.code);
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
      code: ctx.request.body.code,
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

  const jwt = await new SignJWT({ id, username, global_name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("1y")
    .sign(new TextEncoder().encode(JWT_SECRET));

  ctx.response.body = { jwt, username, global_name };
});

app.use(router.routes());
app.use(router.allowedMethods());

export default app;
