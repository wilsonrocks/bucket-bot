import { Kysely, sql } from "kysely";
import { DB } from "kysely-codegen";
import { withinLastYaer } from "./ranking-type-logic";

export const generateFactionRankings = async (dbClient: Kysely<DB>) => {
  const batch = await dbClient
    .insertInto("faction_snapshot_batch")
    .defaultValues()
    .returningAll()
    .execute();

  const rankings = await dbClient
    .with("stats", (queryBuilder) =>
      queryBuilder
        .selectFrom("result")
        .innerJoin(
          "player_identity",
          "result.player_identity_id",
          "player_identity.id",
        )
        .innerJoin("tourney", "result.tourney_id", "tourney.id")
        .select((eb) => [
          "result.faction_code as faction_code",
          sql<number>`COUNT(distinct player_identity.player_id)`.as("players"),
          eb.fn.count("result.id").as("declarations"),
          eb.fn.sum("result.points").as("total_points"),
          sql<number>`SUM(result.points)/COUNT(distinct player_identity.player_id)`.as(
            "points_per_player",
          ),
          sql<number>`SUM(result.points)/COUNT(*)`.as("points_per_declaration"),
        ])
        .where(withinLastYaer)
        .groupBy("faction_code"),
    )
    .insertInto("faction_snapshot")
    .columns([
      "batch_id",
      "faction_code",
      "rank",
      "total_points",
      "declarations",
      "points_per_declaration",
    ])
    .expression((eb) =>
      eb
        .selectFrom("stats")
        .select([
          sql.lit<number>(batch[0]!.id).as("batch_id"),
          "faction_code",
          sql<number>`RANK() over (order by points_per_declaration desc)`.as(
            "rank",
          ),
          "total_points",
          "declarations",
          "points_per_declaration",
        ])
        .orderBy("points_per_declaration", "desc"),
    )
    .returningAll()
    .execute();
};

/** `with stats as
(select
	faction_code,
	COUNT(distinct player_id) as players,
	COUNT(*) as declarations,
	SUM(result.points) as total_points,
SUM(result.points)/COUNT(distinct player_id) as points_per_player, SUM(result.points)/COUNT(*)  as points_per_declaration 
from
	result
join tourney on result.tourney_id = tourney.id
where tourney.date >= NOW() - INTERVAL '1 year'
group by
	faction_code
)
	select *, rank() over (order by points_per_declaration  desc) as rank from stats order by points_per_declaration DESC;`;
*/
