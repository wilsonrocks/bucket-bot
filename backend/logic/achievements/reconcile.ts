import type { Qualifier } from "./rules";

export interface ExistingAward {
  playerId: number;
  achievementId: string;
  tourneyId: number | null;
  /** ISO date (yyyy-MM-dd). */
  achievedOn: string;
}

export interface AwardKey {
  playerId: number;
  achievementId: string;
}

export interface AwardDiff {
  inserts: (Qualifier & { achievementId: string })[];
  updates: (Qualifier & { achievementId: string })[];
  deletes: AwardKey[];
}

/**
 * Works out how to bring stored awards for one achievement in line with the
 * current qualifiers. Updates only touch where/when it was achieved, so the
 * announcement state of an existing award is never lost.
 */
export function diffAwards(
  achievementId: string,
  existing: ExistingAward[],
  qualifiers: Qualifier[],
): AwardDiff {
  const existingByPlayer = new Map(
    existing
      .filter((e) => e.achievementId === achievementId)
      .map((e) => [e.playerId, e]),
  );
  const diff: AwardDiff = { inserts: [], updates: [], deletes: [] };

  for (const q of qualifiers) {
    const current = existingByPlayer.get(q.playerId);
    existingByPlayer.delete(q.playerId);
    if (!current) {
      diff.inserts.push({ ...q, achievementId });
    } else if (
      current.tourneyId !== q.tourneyId ||
      current.achievedOn !== q.achievedOn
    ) {
      diff.updates.push({ ...q, achievementId });
    }
  }

  for (const stale of existingByPlayer.values()) {
    diff.deletes.push({ playerId: stale.playerId, achievementId });
  }

  return diff;
}
