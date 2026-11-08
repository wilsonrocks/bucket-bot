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

  for (let i = 0; i < players; i++) {
    const point = maxPointsAdjustedByPlayers - delta * i;
    points.push(point);
  }

  return {
    mastersEligible,
    points,
    delta,
  };
};

/**
 * @param tierCode - The tourney's tier_code (EVENT, GT, NATIONALS). Defaults to EVENT.
 * @param rounds - The number of rounds played, used for EVENT-tier events.
 */
export const maxPoints = (tierCode: string | undefined, rounds: number): number => {
  if (tierCode === "GT") return 130;
  if (tierCode === "NATIONALS") return 140;

  if (rounds === 3) return 100;
  if (rounds === 4) return 110;
  if (rounds >= 5) return 120;
  throw new Error(
    `issue calculating max points for tier ${tierCode} and rounds ${rounds}`,
  );
};
