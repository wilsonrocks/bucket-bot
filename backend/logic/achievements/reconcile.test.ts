import { describe, expect, it } from "vitest";
import { diffAwards, type ExistingAward } from "./reconcile";

const existing = (
  playerId: number,
  tourneyId: number | null,
  achievedOn: string,
  achievementId = "FIRST_EVENT",
): ExistingAward => ({ playerId, achievementId, tourneyId, achievedOn });

describe("diffAwards", () => {
  it("inserts qualifiers with no existing award", () => {
    const diff = diffAwards("FIRST_EVENT", [], [
      { playerId: 1, tourneyId: 10, achievedOn: "2025-01-01" },
    ]);
    expect(diff).toEqual({
      inserts: [
        { playerId: 1, tourneyId: 10, achievedOn: "2025-01-01", achievementId: "FIRST_EVENT" },
      ],
      updates: [],
      deletes: [],
    });
  });

  it("does nothing when awards already match", () => {
    const diff = diffAwards(
      "FIRST_EVENT",
      [existing(1, 10, "2025-01-01")],
      [{ playerId: 1, tourneyId: 10, achievedOn: "2025-01-01" }],
    );
    expect(diff).toEqual({ inserts: [], updates: [], deletes: [] });
  });

  it("updates an award whose qualifying tourney changed", () => {
    const diff = diffAwards(
      "FIRST_EVENT",
      [existing(1, 10, "2025-01-01")],
      [{ playerId: 1, tourneyId: 7, achievedOn: "2024-06-01" }],
    );
    expect(diff.updates).toEqual([
      { playerId: 1, tourneyId: 7, achievedOn: "2024-06-01", achievementId: "FIRST_EVENT" },
    ]);
    expect(diff.inserts).toEqual([]);
    expect(diff.deletes).toEqual([]);
  });

  it("repoints an award whose tourney was deleted", () => {
    const diff = diffAwards(
      "FIRST_EVENT",
      [existing(1, null, "2025-01-01")],
      [{ playerId: 1, tourneyId: 11, achievedOn: "2025-01-01" }],
    );
    expect(diff.updates).toHaveLength(1);
  });

  it("deletes awards that no longer qualify", () => {
    const diff = diffAwards(
      "FIRST_EVENT",
      [existing(1, 10, "2025-01-01"), existing(2, 10, "2025-01-01")],
      [{ playerId: 2, tourneyId: 10, achievedOn: "2025-01-01" }],
    );
    expect(diff.deletes).toEqual([{ playerId: 1, achievementId: "FIRST_EVENT" }]);
  });

  it("ignores existing awards for other achievements", () => {
    const diff = diffAwards(
      "FIRST_EVENT",
      [existing(1, 10, "2025-01-01", "WIN_EVENT")],
      [],
    );
    expect(diff).toEqual({ inserts: [], updates: [], deletes: [] });
  });
});
