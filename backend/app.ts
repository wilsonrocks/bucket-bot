import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "kysely-codegen";
import { Pool } from "pg";

const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

async function main() {
  const rows = await db.selectFrom("tourney").selectAll().execute();
  //    ^ { created_at: Date; email: string; id: number; ... }[]
  console.log(rows);
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
