import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "kysely-codegen";
import { Pool } from "pg";
import Koa from "koa";
import Router from "@koa/router";
import fs from "fs";

// const ca = fs.readFileSync("./certs/ca.pem").toString();

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

const router = new Router({ prefix: "/v1" });

router.get("/tourney", async (ctx) => {
  const rows = await getRows();
  ctx.body = { fakeData: rows };
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx) => {
  ctx.body;
});

app.use(async (ctx) => {
  ctx.body = "I am bUKet bot for your uk malifaux rankings needs!\n";
});

export default app;
