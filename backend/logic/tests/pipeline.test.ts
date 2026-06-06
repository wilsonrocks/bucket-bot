import { beforeEach, describe, expect, test, vi } from "vitest";
import { dbClient } from "../../db-client";
import { runStep, type StepDef } from "../pipeline/run-step";
import { runPipeline, retryPipelineSteps } from "../pipeline/rankings-pipeline";

// This is an integration test of the orchestrator (real DB via testcontainers,
// fake step fns). The end-of-run Discord summary is not under test, so stub it
// out — keeps the test off Discord and independent of ambient DISCORD_* env.
vi.mock("../pipeline/notify-ops", () => ({ postPipelineSummary: vi.fn() }));

// Fast retries, no real timers, no Discord.
const FAST = { backoffMs: [0], sleep: async () => {} };

beforeEach(async () => {
  await dbClient.deleteFrom("pipeline_job_step").execute();
});

async function rowsFor(runId: string) {
  return dbClient
    .selectFrom("pipeline_job_step")
    .selectAll()
    .where("run_id", "=", runId)
    .execute();
}

describe("runStep", () => {
  test("records a success row with one attempt", async () => {
    const r = await runStep(dbClient, {
      stepKey: "ok",
      trigger: "manual",
      fn: async () => 42,
    });

    expect(r.status).toBe("success");
    expect(r.result).toBe(42);
    const [row] = await rowsFor(r.runId);
    expect(row!.status).toBe("success");
    expect(row!.attempts).toBe(1);
    expect(row!.finished_at).not.toBeNull();
  });

  test("retries a flaky fn and succeeds", async () => {
    let calls = 0;
    const r = await runStep(
      dbClient,
      {
        stepKey: "flaky",
        trigger: "scheduled",
        fn: async () => {
          calls += 1;
          if (calls === 1) throw new Error("transient");
          return "done";
        },
      },
      { maxAttempts: 3, ...FAST },
    );

    expect(r.status).toBe("success");
    expect(calls).toBe(2);
    const [row] = await rowsFor(r.runId);
    expect(row!.attempts).toBe(2);
  });

  test("marks failed with the error after exhausting attempts", async () => {
    const r = await runStep(
      dbClient,
      {
        stepKey: "boom",
        trigger: "scheduled",
        fn: async () => {
          throw new Error("always fails");
        },
      },
      { maxAttempts: 2, ...FAST },
    );

    expect(r.status).toBe("failed");
    expect(r.error).toContain("always fails");
    const [row] = await rowsFor(r.runId);
    expect(row!.status).toBe("failed");
    expect(row!.attempts).toBe(2);
    expect(row!.error).toContain("always fails");
  });

  test("skips a step whose dependency did not succeed", async () => {
    const runId = "test-skip-run";
    // Seed a failed dependency row.
    await runStep(
      dbClient,
      { runId, stepKey: "dep", trigger: "scheduled", fn: async () => { throw new Error("x"); } },
      { maxAttempts: 1, ...FAST },
    );

    let called = false;
    const r = await runStep(dbClient, {
      runId,
      stepKey: "dependent",
      trigger: "scheduled",
      dependsOn: ["dep"],
      fn: async () => { called = true; },
    });

    expect(r.status).toBe("skipped");
    expect(called).toBe(false);
    const [row] = await dbClient
      .selectFrom("pipeline_job_step")
      .selectAll()
      .where("run_id", "=", runId)
      .where("step_key", "=", "dependent")
      .execute();
    expect(row!.status).toBe("skipped");
  });
});

describe("runPipeline chain propagation", () => {
  // Mirror the real dependency graph with fake fns; generate-player fails.
  function chainSteps(playerFn: StepDef["fn"]): StepDef[] {
    const ok: StepDef["fn"] = async () => {};
    return [
      { stepKey: "generate-player", fn: playerFn },
      { stepKey: "post-player", dependsOn: ["generate-player"], fn: ok },
      { stepKey: "generate-faction", fn: ok },
      { stepKey: "post-faction", dependsOn: ["generate-faction"], fn: ok },
      { stepKey: "generate-team", dependsOn: ["generate-player"], fn: ok },
      { stepKey: "post-team", dependsOn: ["generate-team"], fn: ok },
      { stepKey: "generate-region", fn: ok },
    ];
  }

  test("a failed generate-player skips its whole subtree, others succeed", async () => {
    const steps = chainSteps(async () => { throw new Error("player boom"); });
    const { runId, results } = await runPipeline(dbClient, "scheduled", steps, { maxAttempts: 1, ...FAST });

    const status = Object.fromEntries(results.map((r) => [r.stepKey, r.status]));
    expect(status["generate-player"]).toBe("failed");
    expect(status["post-player"]).toBe("skipped");
    expect(status["generate-team"]).toBe("skipped");
    expect(status["post-team"]).toBe("skipped");
    expect(status["generate-faction"]).toBe("success");
    expect(status["post-faction"]).toBe("success");
    expect(status["generate-region"]).toBe("success");

    // All recorded under one run.
    const rows = await rowsFor(runId);
    expect(rows.length).toBe(7);
  });

  test("retrying generate-player flips the skipped subtree to success", async () => {
    const failing = chainSteps(async () => { throw new Error("player boom"); });
    const { runId } = await runPipeline(dbClient, "scheduled", failing, { maxAttempts: 1, ...FAST });

    const fixed = chainSteps(async () => {});
    const { results } = await retryPipelineSteps(
      dbClient,
      runId,
      ["generate-player", "post-player", "generate-team", "post-team"],
      fixed,
      { maxAttempts: 1, ...FAST },
    );

    const status = Object.fromEntries(results.map((r) => [r.stepKey, r.status]));
    expect(status["generate-player"]).toBe("success");
    expect(status["post-player"]).toBe("success");
    expect(status["generate-team"]).toBe("success");
    expect(status["post-team"]).toBe("success");

    // generate-player attempts accumulated across the original run + retry.
    const [playerRow] = await dbClient
      .selectFrom("pipeline_job_step")
      .selectAll()
      .where("run_id", "=", runId)
      .where("step_key", "=", "generate-player")
      .execute();
    expect(playerRow!.attempts).toBe(2);
  });
});
