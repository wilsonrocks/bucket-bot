import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { dbClient } from "../../db-client";
import { ACHIEVEMENT_RULES } from "../achievements/rules";
import { Faction } from "../fixtures";
import { makeAchievementFixtures } from "../test-helpers/achievement-fixtures";

const { cleanup, addTourney, addIdentity, addPlayer, addResult } =
  makeAchievementFixtures("test-achievement-rules-");

beforeEach(cleanup);
afterEach(cleanup);

/** Runs a rule and returns playerId → tourneyId, for the given players only. */
async function awarded(ruleId: string, ...playerIds: number[]) {
  const qualifiers = await ACHIEVEMENT_RULES[ruleId]!(dbClient);
  return Object.fromEntries(
    qualifiers
      .filter((q) => playerIds.includes(q.playerId))
      .map((q) => [q.playerId, q.tourneyId]),
  );
}

describe("event counts (all tiers)", () => {
  test("FIRST_EVENT, SECOND_EVENT, FIVE_EVENTS and TEN_EVENTS land on the nth event played", async () => {
    const alice = await addPlayer("alice");
    const tiers = ["GT", "EVENT", "NATIONALS"] as const;
    const tourneys: number[] = [];
    for (let i = 0; i < 10; i++) {
      const id = await addTourney(`t${i}`, `2024-01-${String(i + 10)}`, tiers[i % 3]);
      tourneys.push(id);
      await addResult(alice.identityId, id, 2);
    }

    expect(await awarded("FIRST_EVENT", alice.playerId)).toEqual({ [alice.playerId]: tourneys[0] });
    expect(await awarded("SECOND_EVENT", alice.playerId)).toEqual({ [alice.playerId]: tourneys[1] });
    expect(await awarded("FIVE_EVENTS", alice.playerId)).toEqual({ [alice.playerId]: tourneys[4] });
    expect(await awarded("TEN_EVENTS", alice.playerId)).toEqual({ [alice.playerId]: tourneys[9] });
  });

  test("an event counts once even if the player has two identities in it", async () => {
    const alice = await addPlayer("alice");
    const secondIdentity = await addIdentity("alice-bot", alice.playerId);
    const t1 = await addTourney("t1", "2024-01-10");
    await addResult(alice.identityId, t1, 1);
    await addResult(secondIdentity, t1, 2);

    expect(await awarded("SECOND_EVENT", alice.playerId)).toEqual({});
  });

  test("not awarded before reaching the count", async () => {
    const alice = await addPlayer("alice");
    for (let i = 0; i < 4; i++) {
      await addResult(alice.identityId, await addTourney(`t${i}`, `2024-01-1${i}`), 1);
    }
    expect(await awarded("FIVE_EVENTS", alice.playerId)).toEqual({});
  });
});

describe("tier firsts", () => {
  test("FIRST_GT and FIRST_NATIONALS need an event of that tier", async () => {
    const alice = await addPlayer("alice");
    const event = await addTourney("event", "2024-01-01", "EVENT");
    const gt = await addTourney("gt", "2024-02-01", "GT");
    await addResult(alice.identityId, event, 5);
    await addResult(alice.identityId, gt, 5);

    expect(await awarded("FIRST_GT", alice.playerId)).toEqual({ [alice.playerId]: gt });
    expect(await awarded("FIRST_NATIONALS", alice.playerId)).toEqual({});

    const nationals = await addTourney("nationals", "2024-03-01", "NATIONALS");
    await addResult(alice.identityId, nationals, 5);
    expect(await awarded("FIRST_NATIONALS", alice.playerId)).toEqual({ [alice.playerId]: nationals });
  });
});

describe("podiums and wins", () => {
  test.each([
    ["PODIUM_EVENT", "EVENT", 3, true],
    ["PODIUM_EVENT", "EVENT", 4, false],
    ["PODIUM_EVENT", "GT", 1, false],
    ["PODIUM_GT", "GT", 3, true],
    ["PODIUM_GT", "NATIONALS", 2, false],
    ["PODIUM_NATIONALS", "NATIONALS", 2, true],
    ["WIN_EVENT", "EVENT", 1, true],
    ["WIN_EVENT", "EVENT", 2, false],
    ["WIN_EVENT", "GT", 1, false],
    ["WIN_GT", "GT", 1, true],
    ["WIN_NATIONALS", "NATIONALS", 1, true],
    ["WIN_NATIONALS", "GT", 1, false],
  ] as const)("%s at %s tier, place %i → %s", async (ruleId, tier, place, expected) => {
    const alice = await addPlayer("alice");
    const t = await addTourney("t", "2024-01-01", tier);
    await addResult(alice.identityId, t, place);

    expect(await awarded(ruleId, alice.playerId)).toEqual(
      expected ? { [alice.playerId]: t } : {},
    );
  });
});

describe("WOODEN_SPOON", () => {
  test("goes to last place, judged against every result in the event", async () => {
    const alice = await addPlayer("alice");
    const bob = await addPlayer("bob");
    const t = await addTourney("t", "2024-01-01");
    await addResult(alice.identityId, t, 1);
    await addResult(bob.identityId, t, 2);

    expect(await awarded("WOODEN_SPOON", alice.playerId, bob.playerId)).toEqual({ [bob.playerId]: t });

    // An unlinked identity finishing below Bob takes last place away from him.
    const t2 = await addTourney("t2", "2024-02-01");
    await addResult(bob.identityId, t2, 2);
    await addResult(await addIdentity("unlinked", null), t2, 3);
    expect(await awarded("WOODEN_SPOON", bob.playerId)).toEqual({ [bob.playerId]: t });
  });

  test("isn't given to the only player in an event", async () => {
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, await addTourney("t", "2024-01-01"), 1);
    expect(await awarded("WOODEN_SPOON", alice.playerId)).toEqual({});
  });
});

describe("BEST_IN_FACTION", () => {
  test("goes to the highest placed player of each faction, including sole declarers", async () => {
    const alice = await addPlayer("alice");
    const bob = await addPlayer("bob");
    const carol = await addPlayer("carol");
    const t = await addTourney("t", "2024-01-01");
    await addResult(carol.identityId, t, 1, Faction.BAYOU);
    await addResult(alice.identityId, t, 2, Faction.GUILD);
    await addResult(bob.identityId, t, 3, Faction.GUILD);

    expect(await awarded("BEST_IN_FACTION", alice.playerId, bob.playerId, carol.playerId)).toEqual({
      [alice.playerId]: t,
      [carol.playerId]: t,
    });
  });

  test("an unlinked identity above the player in their faction takes it", async () => {
    const alice = await addPlayer("alice");
    const t = await addTourney("t", "2024-01-01");
    await addResult(await addIdentity("unlinked", null), t, 1, Faction.GUILD);
    await addResult(alice.identityId, t, 2, Faction.GUILD);

    expect(await awarded("BEST_IN_FACTION", alice.playerId)).toEqual({});
  });
});

describe("ASTBURYS_DREAM", () => {
  test("needs last place and best in faction at the same event", async () => {
    const alice = await addPlayer("alice");
    const bob = await addPlayer("bob");
    const t = await addTourney("t", "2024-01-01");
    await addResult(alice.identityId, t, 1, Faction.GUILD);
    await addResult(bob.identityId, t, 2, Faction.BAYOU);

    expect(await awarded("ASTBURYS_DREAM", alice.playerId, bob.playerId)).toEqual({ [bob.playerId]: t });
  });

  test("isn't awarded when the spoon and best in faction came at different events", async () => {
    const alice = await addPlayer("alice");
    const bob = await addPlayer("bob");
    const carol = await addPlayer("carol");
    // t1: Bob last but Alice (also Guild) beat him.
    const t1 = await addTourney("t1", "2024-01-01");
    await addResult(alice.identityId, t1, 1, Faction.GUILD);
    await addResult(bob.identityId, t1, 2, Faction.GUILD);
    // t2: Bob best (only) Bayou but Carol came last.
    const t2 = await addTourney("t2", "2024-02-01");
    await addResult(bob.identityId, t2, 1, Faction.BAYOU);
    await addResult(carol.identityId, t2, 2, Faction.BAYOU);

    expect(await awarded("WOODEN_SPOON", bob.playerId)).toEqual({ [bob.playerId]: t1 });
    expect(await awarded("BEST_IN_FACTION", bob.playerId)).toEqual({ [bob.playerId]: t2 });
    expect(await awarded("ASTBURYS_DREAM", bob.playerId)).toEqual({});
  });
});

describe("faction variety", () => {
  const ALL_FACTIONS = Object.values(Faction);

  test("DIFFERENT_FACTION, HALF_RAINBOW and RAINBOW land on the event of the 2nd, 4th and last new faction", async () => {
    const alice = await addPlayer("alice");
    const tourneys: number[] = [];
    // A repeated faction between each new one shouldn't advance the count.
    const declarations = ALL_FACTIONS.flatMap((f, i) => (i === 0 ? [f] : [ALL_FACTIONS[0]!, f]));
    for (const [i, faction] of declarations.entries()) {
      const t = await addTourney(`t${i}`, `2024-01-${String(i + 10)}`);
      tourneys.push(t);
      await addResult(alice.identityId, t, 1, faction);
    }
    // New factions are at declarations index 0, 2, 4, ... 2(k-1).
    expect(await awarded("DIFFERENT_FACTION", alice.playerId)).toEqual({ [alice.playerId]: tourneys[2] });
    expect(await awarded("HALF_RAINBOW", alice.playerId)).toEqual({ [alice.playerId]: tourneys[6] });
    expect(await awarded("RAINBOW", alice.playerId)).toEqual({
      [alice.playerId]: tourneys[2 * (ALL_FACTIONS.length - 1)],
    });
  });

  test("RAINBOW needs every faction in the faction table", async () => {
    const alice = await addPlayer("alice");
    for (const [i, faction] of ALL_FACTIONS.slice(1).entries()) {
      await addResult(alice.identityId, await addTourney(`t${i}`, `2024-01-${String(i + 10)}`), 1, faction);
    }
    expect(await awarded("HALF_RAINBOW", alice.playerId)).not.toEqual({});
    expect(await awarded("RAINBOW", alice.playerId)).toEqual({});
  });

  test("only one faction doesn't earn DIFFERENT_FACTION", async () => {
    const alice = await addPlayer("alice");
    await addResult(alice.identityId, await addTourney("t1", "2024-01-10"), 1, Faction.GUILD);
    await addResult(alice.identityId, await addTourney("t2", "2024-01-11"), 1, Faction.GUILD);
    expect(await awarded("DIFFERENT_FACTION", alice.playerId)).toEqual({});
  });
});

describe("per-faction achievements", () => {
  test("FIRST_EVENT, FIVE_EVENTS and TEN_EVENTS count only events declaring that faction", async () => {
    const alice = await addPlayer("alice");
    const tourneys: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t = await addTourney(`t${i}`, `2024-01-${String(i + 10)}`, i % 2 ? "GT" : "EVENT");
      tourneys.push(t);
      // Alternate Guild (even) and Bayou (odd) events.
      await addResult(alice.identityId, t, 5, i % 2 ? Faction.BAYOU : Faction.GUILD);
    }

    expect(await awarded("GUILD_FIRST_EVENT", alice.playerId)).toEqual({ [alice.playerId]: tourneys[0] });
    expect(await awarded("BAYOU_FIRST_EVENT", alice.playerId)).toEqual({ [alice.playerId]: tourneys[1] });
    expect(await awarded("GUILD_FIVE_EVENTS", alice.playerId)).toEqual({ [alice.playerId]: tourneys[8] });
    expect(await awarded("BAYOU_TEN_EVENTS", alice.playerId)).toEqual({ [alice.playerId]: tourneys[19] });
    expect(await awarded("RESSERS_FIRST_EVENT", alice.playerId)).toEqual({});
  });

  test("BEST_IN_FACTION, PODIUM and WINNER are per declared faction, at any tier", async () => {
    const alice = await addPlayer("alice");
    const bob = await addPlayer("bob");
    const gt = await addTourney("gt", "2024-01-01", "GT");
    await addResult(alice.identityId, gt, 1, Faction.NEVERBORN);
    await addResult(bob.identityId, gt, 2, Faction.NEVERBORN);
    const event = await addTourney("event", "2024-02-01");
    await addResult(alice.identityId, event, 4, Faction.OUTCASTS);
    await addResult(bob.identityId, event, 3, Faction.OUTCASTS);

    expect(await awarded("NEVERBORN_WINNER", alice.playerId, bob.playerId)).toEqual({ [alice.playerId]: gt });
    expect(await awarded("NEVERBORN_PODIUM", alice.playerId, bob.playerId)).toEqual({
      [alice.playerId]: gt,
      [bob.playerId]: gt,
    });
    expect(await awarded("NEVERBORN_BEST_IN_FACTION", alice.playerId, bob.playerId)).toEqual({
      [alice.playerId]: gt,
    });
    expect(await awarded("OUTCASTS_BEST_IN_FACTION", alice.playerId, bob.playerId)).toEqual({
      [bob.playerId]: event,
    });
    expect(await awarded("OUTCASTS_PODIUM", alice.playerId, bob.playerId)).toEqual({ [bob.playerId]: event });
    expect(await awarded("OUTCASTS_WINNER", alice.playerId, bob.playerId)).toEqual({});
  });

  test("there are six achievements for every faction", () => {
    for (const faction of Object.values(Faction)) {
      const ids = Object.keys(ACHIEVEMENT_RULES).filter((id) => id.startsWith(`${faction}_`));
      expect(ids.sort()).toEqual(
        ["BEST_IN_FACTION", "FIRST_EVENT", "FIVE_EVENTS", "PODIUM", "TEN_EVENTS", "WINNER"]
          .map((kind) => `${faction}_${kind}`)
          .sort(),
      );
    }
  });
});

test("every seeded achievement has a rule", async () => {
  const rows = await dbClient.selectFrom("achievement").select("id").execute();
  expect(Object.keys(ACHIEVEMENT_RULES).sort()).toEqual(rows.map((r) => r.id).sort());
});
