import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "kysely-codegen";
import { Pool } from "pg";
import Koa from "koa";

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

app.use(async (ctx) => {
  if (ctx.path === "/tourney") {
    const rows = await getRows();
    ctx.body = rows;
  } else {
    ctx.body = "Hello World";
  }
});

export default app;
