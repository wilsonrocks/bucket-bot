import { Kysely, sql } from "kysely";
import { DB } from "kysely-codegen";

export const generateRegionSnapshot = async (db: Kysely<DB>) => {
  const batch = await db
    .insertInto("region_snapshot_batch")
    .defaultValues()
    .returningAll()
    .executeTakeFirstOrThrow();

  const regionCounts = await db
    .selectFrom("region")
    .leftJoin("venue", "venue.region_id", "region.id")
    .leftJoin("tourney", (join) =>
      join
        .onRef("tourney.venue_id", "=", "venue.id")
        .on(sql`tourney.date >= current_date - interval '1 year'`),
    )
    .select(["region.id as region_id", (eb) => eb.fn.count("tourney.id").as("event_count")])
    .groupBy("region.id")
    .execute();

  await db
    .insertInto("region_snapshot")
    .values(
      regionCounts.map((r) => ({
        batch_id: batch.id,
        region_id: r.region_id,
        event_count: Number(r.event_count),
      })),
    )
    .execute();
};
