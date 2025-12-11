import { describe, expect, it } from "vitest";
import { calculatePoints } from "./points";

describe("mastersEligibility", () => {
  describe("ineligible if fewer than twelve players", () => {
    it("two players", () => {
      const output = calculatePoints(2, 100);
      expect(output.mastersEligible).toBe(false);
    });
    it("11 players", () => {
      const output = calculatePoints(11, 100);
      expect(output.mastersEligible).toBe(false);
    });
  });
  describe("eligible if twelve or more players", () => {
    it("12 players", () => {
      const output = calculatePoints(12, 100);
      expect(output.mastersEligible).toBe(true);
    });
    it("20 players", () => {
      const output = calculatePoints(20, 100);
      expect(output.mastersEligible).toBe(true);
    });
  });
});
7;

describe("fewer than eight players results in zero points", () => {
  it("7 players", () => {
    const output = calculatePoints(7, 100);
    expect(output.points.length).toBe(7);
    output.points.forEach((point) => {
      expect(point).toBe(0);
    });
    expect(output.delta).toBe(0);
  });
  it("2 players", () => {
    const output = calculatePoints(2, 100);
    expect(output.points.length).toBe(2);
    output.points.forEach((point) => {
      expect(point).toBe(0);
    });
    expect(output.delta).toBe(0);
  });
});

describe("scaling points", () => {
  describe("max points unreduced for 16 players or more", () => {
    it("16 players", () => {
      const output = calculatePoints(16, 100);

      expect(output.points.length).toBe(16);
      expect(Math.max(...output.points)).toBe(100);
    });

    it("20 players", () => {
      const output = calculatePoints(20, 100);

      expect(output.points.length).toBe(20);
      expect(Math.max(...output.points)).toBe(100);
    });
  });

  describe("max points reduced by 1 for each player under 16", () => {
    it("15 players", () => {
      const output = calculatePoints(15, 100);

      expect(output.points.length).toBe(15);
      expect(Math.max(...output.points)).toBe(99);
    });

    it("8 players", () => {
      const output = calculatePoints(8, 100);

      expect(output.points.length).toBe(8);
      expect(Math.max(...output.points)).toBe(92);
    });
  });

  describe("lowest points is 5", () => {
    for (let players = 8; players <= 32; players++) {
      it(`${players} players`, () => {
        const output = calculatePoints(players, 100);
        expect(Math.min(...output.points)).toBe(5);
      });
    }
  });

  describe("worked examples", () => {
    it("12 players, 100 max points", () => {
      const output = calculatePoints(12, 100);
      expect(output.delta).toBeCloseTo(8.272727272727, 2);
      const answer: number[] = [
        96, 87.72727273, 79.45454545, 71.18181818, 62.90909091, 54.63636364,
        46.36363636, 38.09090909, 29.81818182, 21.54545455, 13.27272727, 5,
      ];
      for (let i = 0; i < answer.length - 1; i++) {
        expect(output.points[i]).toBeCloseTo(answer[i], 2);
      }
    });

    it("40 players, 140 max points", () => {
      const output = calculatePoints(40, 140);
      expect(output.delta).toBeCloseTo(3.461538462, 2);
      const answer: number[] = [
        140, 136.5384615, 133.0769231, 129.6153846, 126.1538462, 122.6923077,
        119.2307692, 115.7692308, 112.3076923, 108.8461538, 105.3846154,
        101.9230769, 98.46153846, 95, 91.53846154, 88.07692308, 84.61538462,
        81.15384615, 77.69230769, 74.23076923, 70.76923077, 67.30769231,
        63.84615385, 60.38461538, 56.92307692, 53.46153846, 50, 46.53846154,
        43.07692308, 39.61538462, 36.15384615, 32.69230769, 29.23076923,
        25.76923077, 22.30769231, 18.84615385, 15.38461538, 11.92307692,
        8.461538462, 5,
      ];
      for (let i = 0; i < answer.length - 1; i++) {
        expect(output.points[i]).toBeCloseTo(answer[i], 2);
      }
    });
  });
});
