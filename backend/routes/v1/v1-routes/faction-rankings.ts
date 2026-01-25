import { Context } from "koa";
import { generateFactionRankings } from "../../../logic/rankings/generate-faction-rankings";
import { success } from "zod";

export const getFactionRankings = async (ctx: Context) => {
  const newestBatch = await ctx.state.db
    .selectFrom("faction_snapshot_batch")
    .select("id")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!newestBatch) {
    ctx.response.body = [];
    return;
  }

  const data = await ctx.state.db
    .selectFrom("faction_snapshot")
    .innerJoin(
      "faction_snapshot_batch",
      "faction_snapshot.batch_id",
      "faction_snapshot_batch.id",
    )
    .innerJoin("faction", "faction_snapshot.faction_code", "faction.name_code")
    .select([
      "faction_snapshot_batch.created_at as snapshot_date",
      "faction.name as faction_name",
      "faction_snapshot.rank as rank",
      "faction.name_code as faction_code",
      "faction_snapshot.total_points as total_points",
      "faction_snapshot.declarations as declarations",
      "faction_snapshot.points_per_declaration as points_per_declaration",
    ])
    .where("faction_snapshot.batch_id", "=", newestBatch.id)
    .orderBy("rank")
    .execute();

  ctx.response.body = data;
};

export const generateFactionRankingsHandler = async (ctx: Context) => {
  await generateFactionRankings(ctx.state.db);
  ctx.response.status = 200;
  ctx.response.body = { success: true };
};
