import { beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { addTestDataToDb } from "../test-helpers/add-test-data-to-db";
import {
  formatBiggestMovers,
  formatMover,
  getBiggestMovers,
  type Mover,
} from "./biggest-movers";

const ALICE = 10001;
const BOB = 10002;
const CHARLIE = 10003;
const DAVID = 10004;
const EVE = 10005;

type Row = { rank: number; rank_change: number | null; new_player?: boolean };

async function addBatch(rows: Record<number, Row>) {
  const batch = await dbClient
    .insertInto("ranking_snapshot_batch")
    .values({ type_code: "ROLLING_YEAR" })
    .returning("id")
    .executeTakeFirstOrThrow();
  await dbClient
    .insertInto("ranking_snapshot")
    .values(
      Object.entries(rows).map(([playerId, r]) => ({
        batch_id: batch.id,
        player_id: Number(playerId),
        rank: r.rank,
        rank_change: r.rank_change,
        new_player: r.new_player ?? false,
        total_points: 100 - r.rank,
      })),
    )
    .execute();
  return batch.id;
}

const ids = (movers: Mover[]) => movers.map((m) => m.player_id);

beforeEach(async () => {
  await addTestDataToDb(dbClient);
});

describe("getBiggestMovers", () => {
  test("orders by places climbed, biggest first", async () => {
    const batchId = await addBatch({
      [ALICE]: { rank: 1, rank_change: 2 },
      [BOB]: { rank: 2, rank_change: 10 },
      [CHARLIE]: { rank: 3, rank_change: 5 },
    });
    expect(ids(await getBiggestMovers(dbClient, batchId))).toEqual([
      BOB,
      CHARLIE,
      ALICE,
    ]);
  });

  test("breaks ties by current rank", async () => {
    const batchId = await addBatch({
      [ALICE]: { rank: 4, rank_change: 3 },
      [BOB]: { rank: 2, rank_change: 3 },
    });
    expect(ids(await getBiggestMovers(dbClient, batchId))).toEqual([BOB, ALICE]);
  });

  test("excludes new, returning, unmoved and falling players", async () => {
    const batchId = await addBatch({
      [ALICE]: { rank: 1, rank_change: null, new_player: true },
      [BOB]: { rank: 2, rank_change: null },
      [CHARLIE]: { rank: 3, rank_change: 0 },
      [DAVID]: { rank: 4, rank_change: -2 },
      [EVE]: { rank: 5, rank_change: 1 },
    });
    expect(ids(await getBiggestMovers(dbClient, batchId))).toEqual([EVE]);
  });

  test("returns nothing when nobody climbed", async () => {
    const batchId = await addBatch({
      [ALICE]: { rank: 1, rank_change: 0 },
      [BOB]: { rank: 2, rank_change: -1 },
    });
    expect(await getBiggestMovers(dbClient, batchId)).toEqual([]);
  });

  test("respects the limit", async () => {
    const batchId = await addBatch({
      [ALICE]: { rank: 1, rank_change: 1 },
      [BOB]: { rank: 2, rank_change: 2 },
      [CHARLIE]: { rank: 3, rank_change: 3 },
    });
    expect(ids(await getBiggestMovers(dbClient, batchId, 2))).toEqual([
      CHARLIE,
      BOB,
    ]);
  });

  test("only looks at the given batch", async () => {
    await addBatch({ [ALICE]: { rank: 1, rank_change: 20 } });
    const batchId = await addBatch({ [BOB]: { rank: 1, rank_change: 1 } });
    expect(ids(await getBiggestMovers(dbClient, batchId))).toEqual([BOB]);
  });
});

describe("formatting", () => {
  const mover: Mover = {
    player_id: ALICE,
    name: "Alice",
    rank: 28,
    rank_change: 52,
    discord_user_id: null,
    discord_display_name: null,
  };

  test("shows places climbed with old and new rank", () => {
    expect(formatMover(mover)).toBe("**Alice** ↑52 (#80 → #28)");
  });

  test("uses a supplied display name, e.g. a mention", () => {
    expect(formatMover(mover, "<@123>")).toBe("<@123> ↑52 (#80 → #28)");
  });

  test("joins movers one per line", () => {
    expect(
      formatBiggestMovers([mover, { ...mover, name: "Bob", rank: 3, rank_change: 4 }]),
    ).toBe("**Alice** ↑52 (#80 → #28)\n**Bob** ↑4 (#7 → #3)");
  });

  test("is null when there are no movers", () => {
    expect(formatBiggestMovers([])).toBeNull();
  });
});
