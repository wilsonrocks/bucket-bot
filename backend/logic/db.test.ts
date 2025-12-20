import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { dbClient } from "../db-client";

let container: any;

export async function teardown() {
  await container.stop();
}

describe.sequential("testing with containers exciting", () => {
  test("sample test", async () => {
    // Your test logic here
    const tourneys = await dbClient.selectFrom("tourney").selectAll().execute();
    expect(tourneys.length).toBe(0);

    const factions = await dbClient.selectFrom("faction").selectAll().execute();
    expect(factions.length).toBe(0);
  });
});
