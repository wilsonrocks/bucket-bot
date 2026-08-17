import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { format, subMonths } from "date-fns";
import { dbClient } from "../../db-client";
import { generateRankings } from "../rankings/generate-player-rankings";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";
import { Faction } from "../fixtures";

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

describe("generating player rankings", () => {
  test("throws for invalid rankings type", async () => {
    await expect(
      generateRankings(dbClient, "NOT_A_REAL_TYPE"),
    ).rejects.toThrowError("Invalid rankings type");
  });

  test("ROLLING_YEAR rankings", async () => {
    await generateRankings(dbClient, "ROLLING_YEAR");

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("ROLLING_YEAR");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(5);

    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(30);
    expect(Bob!.total_points).toBe(39);
    expect(Charlie!.total_points).toBe(39);
    expect(David!.total_points).toBe(14);
    expect(Eve!.total_points).toBe(4);

    expect(Charlie!.rank).toBe(1);
    expect(Bob!.rank).toBe(1);
    expect(Alice!.rank).toBe(3);
    expect(David!.rank).toBe(4);
    expect(Eve!.rank).toBe(5);
  });

  test("BEST_RESSER rankings", async () => {
    await generateRankings(dbClient, "BEST_RESSER");
    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();

    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("BEST_RESSER");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(3);
    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(15);
    expect(Alice!.rank).toBe(1);
    expect(Bob).toBeUndefined();
    expect(Charlie).toBeUndefined();
    expect(David!.total_points).toBe(9);
    expect(David!.rank).toBe(2);
    expect(Eve!.total_points).toBe(4);
    expect(Eve!.rank).toBe(3);
  });

  test("MASTERS rankings", async () => {
    await generateRankings(dbClient, "MASTERS", {
      playersNeededToBeMastersRanked: 4,
      numberOfTourneysToConsider: 5,
    });

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("MASTERS");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(5);

    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(15);
    expect(Bob!.total_points).toBe(29);
    expect(Charlie!.total_points).toBe(34);
    expect(David!.total_points).toBe(14);
    expect(Eve!.total_points).toBe(4);

    expect(Charlie!.rank).toBe(1);
    expect(Bob!.rank).toBe(2);
    expect(Alice!.rank).toBe(3);
    expect(David!.rank).toBe(4);
    expect(Eve!.rank).toBe(5);
  });

  test("BEST X rankings", async () => {
    await generateRankings(dbClient, "ROLLING_YEAR", {
      playersNeededToBeMastersRanked: 10,
      numberOfTourneysToConsider: 1,
    });

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("ROLLING_YEAR");

    const rankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .selectAll()
      .execute();

    expect(rankings.length).toBe(5);

    const Alice = rankings.find((x) => x.name === "Alice");
    const Bob = rankings.find((x) => x.name === "Bob");
    const Charlie = rankings.find((x) => x.name === "Charlie");
    const David = rankings.find((x) => x.name === "David");
    const Eve = rankings.find((x) => x.name === "Eve");

    expect(Alice!.total_points).toBe(15);
    expect(Bob!.total_points).toBe(19);
    expect(Charlie!.total_points).toBe(20);
    expect(David!.total_points).toBe(9);
    expect(Eve!.total_points).toBe(4);

    expect(Charlie!.rank).toBe(1);
    expect(Bob!.rank).toBe(2);
    expect(Alice!.rank).toBe(3);
    expect(David!.rank).toBe(4);
    expect(Eve!.rank).toBe(5);
  });

  test("new_player flag reflects first event, not first snapshot appearance", async () => {
    // First batch — everyone is new (no prior batch to compare against).
    await generateRankings(dbClient, "ROLLING_YEAR");

    const firstBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .executeTakeFirstOrThrow();

    const firstRankings = await dbClient
      .selectFrom("ranking_snapshot")
      .where("batch_id", "=", firstBatch.id)
      .selectAll()
      .execute();
    expect(firstRankings.every((r) => r.new_player)).toBe(true);

    // A venue for the extra tourneys.
    const [venue] = await dbClient
      .insertInto("venue")
      .values({ name: "New Test Venue", post_code: "TEST-NEW-1", region_id: 2 })
      .returning("id")
      .execute();

    // A tourney dated AFTER the first batch (a fresh weekend event).
    const [recentTourney] = await dbClient
      .insertInto("tourney")
      .values({
        name: "Recent Tourney",
        date: format(new Date(), "yyyy-MM-dd"),
        number_of_players: 2,
        venue_id: venue!.id,
      })
      .returning("id")
      .execute();

    // A tourney dated BEFORE the first batch (results existed all along, but the
    // player/identity is only linked now — the case the old code mis-flagged).
    const [oldTourney] = await dbClient
      .insertInto("tourney")
      .values({
        name: "Old Tourney (predates first batch)",
        date: format(subMonths(new Date(), 2), "yyyy-MM-dd"),
        number_of_players: 1,
        venue_id: venue!.id,
      })
      .returning("id")
      .execute();

    // Genuine debut: only result is in the recent tourney.
    const [debut] = await dbClient
      .insertInto("player")
      .values({ name: "Debut" })
      .returning("id")
      .execute();
    const [debutIdentity] = await dbClient
      .insertInto("player_identity")
      .values({
        identity_provider_id: "LONGSHANKS",
        player_id: debut!.id,
        external_id: "LS-DEBUT",
        provider_name: "Debut",
      })
      .returning("id")
      .execute();
    await dbClient
      .insertInto("result")
      .values({
        tourney_id: recentTourney!.id,
        player_identity_id: debutIdentity!.id,
        points: 10,
        place: 1,
        faction_code: Faction.GUILD,
        rounds_played: 4,
      })
      .execute();

    // Late-linked veteran: linked to a player only now, but has a result in a
    // tourney dated before the first batch — so NOT actually new.
    const [veteran] = await dbClient
      .insertInto("player")
      .values({ name: "Veteran" })
      .returning("id")
      .execute();
    const [veteranIdentity] = await dbClient
      .insertInto("player_identity")
      .values({
        identity_provider_id: "LONGSHANKS",
        player_id: veteran!.id,
        external_id: "LS-VET",
        provider_name: "Veteran",
      })
      .returning("id")
      .execute();
    await dbClient
      .insertInto("result")
      .values([
        {
          tourney_id: oldTourney!.id,
          player_identity_id: veteranIdentity!.id,
          points: 12,
          place: 1,
          faction_code: Faction.RESSERS,
          rounds_played: 4,
        },
        {
          tourney_id: recentTourney!.id,
          player_identity_id: veteranIdentity!.id,
          points: 8,
          place: 2,
          faction_code: Faction.RESSERS,
          rounds_played: 4,
        },
      ])
      .execute();

    // Second batch.
    await generateRankings(dbClient, "ROLLING_YEAR");

    const batches = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .orderBy("id", "desc")
      .execute();
    const secondBatch = batches[0]!;
    expect(secondBatch.id).not.toBe(firstBatch.id);

    const secondRankings = await dbClient
      .selectFrom("ranking_snapshot")
      .innerJoin("player", "ranking_snapshot.player_id", "player.id")
      .where("batch_id", "=", secondBatch.id)
      .select(["player.name", "ranking_snapshot.new_player"])
      .execute();

    const debutRow = secondRankings.find((r) => r.name === "Debut");
    const veteranRow = secondRankings.find((r) => r.name === "Veteran");

    expect(debutRow?.new_player, "genuine debut is new").toBe(true);
    expect(veteranRow?.new_player, "late-linked veteran is not new").toBe(false);

    // Fixture players who appeared in batch 1 are not re-flagged as new.
    const alice = secondRankings.find((r) => r.name === "Alice");
    expect(alice?.new_player, "returning fixture player is not new").toBe(false);
  });

  test("saving events used for rankings", async () => {
    await generateRankings(dbClient, "ROLLING_YEAR", {
      playersNeededToBeMastersRanked: 10,
      numberOfTourneysToConsider: 2,
    });

    const snapshotBatch = await dbClient
      .selectFrom("ranking_snapshot_batch")
      .selectAll()
      .execute();
    expect(snapshotBatch.length).toBe(1);
    expect(snapshotBatch[0]!.type_code).toBe("ROLLING_YEAR");

    const events = await dbClient
      .selectFrom("ranking_snapshot_event")
      .innerJoin(
        "ranking_snapshot_batch",
        "ranking_snapshot_event.batch_id",
        "ranking_snapshot_batch.id",
      )
      .innerJoin("player", "ranking_snapshot_event.player_id", "player.id")
      .where("ranking_snapshot_batch.id", "=", snapshotBatch[0]!.id)
      .selectAll()
      .execute();

    // Charlie first

    const charlieEvents = events.filter((e) => e.name === "Charlie");

    expect(charlieEvents.length, "caps events at two").toBe(2);
    expect(charlieEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tourney_id: 2 }), // from tourney3
        expect.objectContaining({ tourney_id: 3 }), // from tourney2
      ]),
    );

    // then bob (who has same points for two)

    const bobEvents = events.filter((e) => e.name === "Bob");
    expect(bobEvents.length, "caps events at two").toBe(2);
    const bobTourneyIds = bobEvents.map((e) => e.tourney_id);
    expect(bobTourneyIds).toContain(2);
    expect(bobTourneyIds.some((id) => id === 1 || id === 3)).toBe(true); // from tourney2

    const eveEvents = events.filter((e) => e.name === "Eve");
    expect(eveEvents.length, "only one event for eve").toBe(1);
    expect(eveEvents[0]!.tourney_id).toBe(2); // from tourney2
  });
});
