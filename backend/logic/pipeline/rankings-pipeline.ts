import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { generateRankings } from "../rankings/generate-player-rankings.js";
import { generateTeamRankings } from "../rankings/generate-team-rankings.js";
import { generateFactionRankings } from "../rankings/generate-faction-rankings.js";
import { generateRegionSnapshot } from "../rankings/generate-region-snapshots.js";
import { postDiscordRankings } from "../discord/post-rankings.js";
import { postTeamRankingsToDiscord } from "../discord/team-rankings.js";
import { postFactionRankings } from "../discord/post-faction-rankings.js";
import { syncDiscordUsers } from "../discord/sync-discord-users.js";
import { postPipelineSummary } from "./notify-ops.js";
import {
  runStep,
  type RunStepOpts,
  type RunStepResult,
  type StepDef,
  type StepTrigger,
} from "./run-step.js";

/**
 * Generates player rankings for every ranking type. Throws (aggregating) if any
 * type fails, so the pipeline step is marked failed and dependent steps skip.
 */
export async function generateAllPlayerRankings(db: Kysely<DB>): Promise<void> {
  await generateAllByType(db, (code) => generateRankings(db, code), "player");
}

/** Generates team rankings for every ranking type. Throws if any type fails. */
export async function generateAllTeamRankings(db: Kysely<DB>): Promise<void> {
  await generateAllByType(db, (code) => generateTeamRankings(db, code), "team");
}

async function generateAllByType(
  db: Kysely<DB>,
  run: (code: string) => Promise<unknown>,
  label: string,
): Promise<void> {
  const types = await db
    .selectFrom("ranking_snapshot_type")
    .select("code")
    .execute();
  const results = await Promise.allSettled(types.map((t) => run(t.code)));
  const errors = results.flatMap((r) =>
    r.status === "rejected" ? [r.reason] : [],
  );
  if (errors.length > 0) {
    const detail = errors
      .map((e) => (e instanceof Error ? e.message : String(e)))
      .join("; ");
    throw new Error(
      `Failed to generate ${errors.length} ${label} ranking type(s): ${detail}`,
    );
  }
}

/** The weekly pipeline, in execution order. `dependsOn` keys gate each step. */
export const STEPS: StepDef[] = [
  { stepKey: "fetch-discord", fn: (db) => syncDiscordUsers(db) },
  { stepKey: "generate-player", fn: (db) => generateAllPlayerRankings(db) },
  {
    stepKey: "post-player",
    dependsOn: ["generate-player"],
    fn: (db) => postDiscordRankings(db),
  },
  { stepKey: "generate-faction", fn: (db) => generateFactionRankings(db) },
  {
    stepKey: "post-faction",
    dependsOn: ["generate-faction"],
    fn: (db) => postFactionRankings(db, { live: true }),
  },
  {
    stepKey: "generate-team",
    dependsOn: ["generate-player"],
    fn: (db) => generateAllTeamRankings(db),
  },
  {
    stepKey: "post-team",
    dependsOn: ["generate-team"],
    fn: (db) => postTeamRankingsToDiscord(db),
  },
  { stepKey: "generate-region", fn: (db) => generateRegionSnapshot(db) },
];

export interface PipelineRun {
  runId: string;
  results: RunStepResult[];
}

let isRunning = false;

/** Runs the full pipeline as one recorded run, then posts an ops summary. */
export async function runPipeline(
  db: Kysely<DB>,
  trigger: StepTrigger,
  steps: StepDef[] = STEPS,
  opts?: RunStepOpts,
): Promise<PipelineRun> {
  if (isRunning) {
    throw new Error("Rankings pipeline is already running");
  }
  isRunning = true;
  try {
    const runId = randomUUID();
    const results: RunStepResult[] = [];
    for (const step of steps) {
      results.push(
        await runStep(
          db,
          {
            runId,
            stepKey: step.stepKey,
            trigger,
            dependsOn: step.dependsOn,
            fn: step.fn,
          },
          opts,
        ),
      );
    }
    await postPipelineSummary(results, trigger);
    return { runId, results };
  } finally {
    isRunning = false;
  }
}

/**
 * Re-runs the given steps of an existing run (in canonical order, respecting
 * dependencies) and re-posts an ops summary. Used by the "retry failed" button.
 */
export async function retryPipelineSteps(
  db: Kysely<DB>,
  runId: string,
  stepKeys: string[],
  steps: StepDef[] = STEPS,
  opts?: RunStepOpts,
): Promise<PipelineRun> {
  const ordered = steps.filter((s) => stepKeys.includes(s.stepKey));
  const results: RunStepResult[] = [];
  for (const step of ordered) {
    results.push(
      await runStep(
        db,
        {
          runId,
          stepKey: step.stepKey,
          trigger: "manual",
          dependsOn: step.dependsOn,
          fn: step.fn,
        },
        opts,
      ),
    );
  }
  await postPipelineSummary(results, "manual");
  return { runId, results };
}
