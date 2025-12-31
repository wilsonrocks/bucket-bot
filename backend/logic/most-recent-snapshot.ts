import { Kysely } from "kysely";
import { DB } from "kysely-codegen";

export const mostRecentSnapshot = async (db: Kysely<DB>, typeCode: string) => {
  const snapshot = await db
    .selectFrom("ranking_snapshot_batch")
    .selectAll()
    .where("type_code", "=", typeCode)
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirstOrThrow();

  return snapshot;
};
