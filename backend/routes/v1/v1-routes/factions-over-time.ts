import { Context } from "koa";
import { p } from "vitest/dist/chunks/reporters.d.OXEK7y4s";

export const getFactionsOverTime = async (ctx: Context) => {
  const factionData = await ctx.state.db
    .selectFrom("faction_snapshot")
    .innerJoin(
      "faction_snapshot_batch",
      "faction_snapshot.batch_id",
      "faction_snapshot_batch.id",
    )
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction_snapshot.batch_id",
      "faction_snapshot.faction_code",
      "faction_snapshot.declarations",
      "faction_snapshot.points_per_declaration",
      "faction_snapshot_batch.created_at as snapshot_date",
      "faction.name",
      "faction.hex_code",
    ])
    .execute();

  const grouped = Object.values(
    factionData.reduce(
      (acc, row) => {
        const key = row.snapshot_date.toISOString();

        if (!acc[key]) {
          acc[key] = {
            date: row.snapshot_date,
            factions: [],
          };
        }

        acc[key].factions.push({
          faction_code: row.faction_code,
          value: row.points_per_declaration,
          declarations: row.declarations,
          points_per_declaration: row.points_per_declaration,
          name: row.name,
          hex_code: row.hex_code,
        });

        return acc;
      },
      {} as Record<string, any>,
    ),
  );

  ctx.body = grouped;
};
