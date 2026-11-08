import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";

interface CalculatePointsOutput {
  delta: number;
  points: number[];
  mastersEligible: boolean;
}

/**
 * Calculates points and eligibility for the Masters tournament.
 * This doesn't take into account the tier or number of rounds,
 * that should be already be factored into maxPoints.
 *
 * @param players - The number of players in the tournament.
 * @param maxPoints - The maximum points available.
 * @returns An object containing the delta, points array, and Masters eligibility.
 */
export const calculatePoints = (
  players: number,
  maxPoints: number,
): CalculatePointsOutput => {
  const mastersEligible = players >= 12;
  // need at least 8 players to earn points
  if (players < 8) {
    return {
      delta: 0,
      points: new Array<number>(players).fill(0),
      mastersEligible,
    };
  }

  const minPoints = 5;
  const maxPointsAdjustedByPlayers =
    players >= 16 ? maxPoints : maxPoints - (16 - players);

  const delta = (maxPointsAdjustedByPlayers - minPoints) / (players - 1);
  const points: number[] = [];

  // Interpolate as one exact integer numerator over (players - 1) rather than
  // `max - delta * i`: that accumulates rounding error, so e.g. last place at a
  // 56-player Nationals came out as 4.999999999999986 instead of 5, breaking
  // ties. This form is exact at both ends and each value is a single correctly
  // rounded division, which float8 in SQL reproduces bit-for-bit.
  for (let i = 0; i < players; i++) {
    const point =
      (maxPointsAdjustedByPlayers * (players - 1 - i) + minPoints * i) /
      (players - 1);
    points.push(point);
  }

  return {
    mastersEligible,
    points,
    delta,
  };
};

/**
 * The maximum points available for an event, before the under-16-players reduction.
 * GT and NATIONALS have a flat max regardless of rounds; other events scale by rounds.
 *
 * @param tierCode - The tourney's tier code (tier.code), e.g. "EVENT", "GT", "NATIONALS".
 * @param rounds - The number of rounds in the event.
 */
export const maxPoints = (
  tierCode: string | null | undefined,
  rounds: number,
): number => {
  if (tierCode === "GT") return 120;
  if (tierCode === "NATIONALS") return 130;

  if (rounds === 3) return 100;
  if (rounds === 4) return 110;
  if (rounds >= 5) return 120;
  throw new Error(
    `issue calculating max points for event tier ${tierCode} and rounds ${rounds}`,
  );
};

/**
 * Recalculates result.points for every placed result of a tourney from its
 * current tier, rounds and number of players.
 */
export const recalculateTourneyPoints = async (
  db: Kysely<DB>,
  tourneyId: number,
): Promise<void> => {
  const tourney = await db
    .selectFrom("tourney")
    .where("id", "=", tourneyId)
    .select(["tier_code", "rounds", "number_of_players"])
    .executeTakeFirstOrThrow();

  const { points } = calculatePoints(
    tourney.number_of_players,
    maxPoints(tourney.tier_code, tourney.rounds),
  );

  const results = await db
    .selectFrom("result")
    .where("tourney_id", "=", tourneyId)
    .where("place", "is not", null)
    .select(["id", "place"])
    .execute();

  for (const result of results) {
    const resultPoints = points[(result.place as number) - 1];
    if (resultPoints === undefined) {
      throw new Error(
        `No points entry for place ${result.place} of ${tourney.number_of_players} in tourney ${tourneyId}`,
      );
    }
    await db
      .updateTable("result")
      .set({ points: resultPoints })
      .where("id", "=", result.id)
      .execute();
  }
};
