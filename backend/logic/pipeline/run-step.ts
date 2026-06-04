import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";

export type StepStatus = "running" | "success" | "failed" | "skipped";
export type StepTrigger = "scheduled" | "manual";

export interface StepDef {
  stepKey: string;
  /** Step keys (within the same run) that must have succeeded for this to run. */
  dependsOn?: string[];
  fn: (db: Kysely<DB>) => Promise<unknown>;
}

export interface RunStepArgs<T> {
  /** Omit for a one-off (manual single-step) run — a fresh run id is generated. */
  runId?: string;
  stepKey: string;
  trigger: StepTrigger;
  dependsOn?: string[] | undefined;
  fn: (db: Kysely<DB>) => Promise<T>;
}

export interface RunStepOpts {
  /** Total attempts including the first. Default 3. */
  maxAttempts?: number;
  /** Backoff before each retry, indexed by retry number. Last value reused. Default [3000, 10000]. */
  backoffMs?: number[];
  sleep?: (ms: number) => Promise<void>;
}

export interface RunStepResult<T = unknown> {
  runId: string;
  stepKey: string;
  status: StepStatus;
  result?: T;
  error?: string;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = [3000, 10000];
const MAX_ERROR_LEN = 2000;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function errorMessage(err: unknown): string {
  const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  return msg.length > MAX_ERROR_LEN ? msg.slice(0, MAX_ERROR_LEN) : msg;
}

/**
 * Runs a single pipeline step, recording its outcome in pipeline_job_step.
 *
 * - If any `dependsOn` step did not succeed for this run, the step is recorded
 *   as `skipped` and `fn` is not called.
 * - Otherwise `fn` is retried up to `maxAttempts` times with backoff. Success
 *   and final failure are both recorded; this never throws.
 * - Rows are keyed by (run_id, step_key): a re-run (retry) updates the existing
 *   row in place and accumulates the attempt count.
 */
export async function runStep<T>(
  db: Kysely<DB>,
  args: RunStepArgs<T>,
  opts: RunStepOpts = {},
): Promise<RunStepResult<T>> {
  const runId = args.runId ?? randomUUID();
  const { stepKey, trigger, dependsOn = [], fn } = args;
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  const sleep = opts.sleep ?? defaultSleep;

  // Existing row for this (run_id, step_key)? (retry path)
  const existing = await db
    .selectFrom("pipeline_job_step")
    .select(["id", "attempts"])
    .where("run_id", "=", runId)
    .where("step_key", "=", stepKey)
    .executeTakeFirst();
  const priorAttempts = existing?.attempts ?? 0;

  // Dependency check: every dependency's latest row must be 'success'.
  if (dependsOn.length > 0) {
    const deps = await db
      .selectFrom("pipeline_job_step")
      .select(["step_key", "status"])
      .where("run_id", "=", runId)
      .where("step_key", "in", dependsOn)
      .execute();
    const ok = dependsOn.every(
      (dep) => deps.find((d) => d.step_key === dep)?.status === "success",
    );
    if (!ok) {
      await writeRow(db, existing?.id, {
        runId,
        stepKey,
        trigger,
        status: "skipped",
        attempts: priorAttempts,
        error: null,
        finished: true,
      });
      return { runId, stepKey, status: "skipped" };
    }
  }

  // Mark running.
  const id = await writeRow(db, existing?.id, {
    runId,
    stepKey,
    trigger,
    status: "running",
    attempts: priorAttempts,
    error: null,
    finished: false,
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(db);
      await db
        .updateTable("pipeline_job_step")
        .set({
          status: "success",
          attempts: priorAttempts + attempt,
          error: null,
          finished_at: new Date(),
        })
        .where("id", "=", id)
        .execute();
      return { runId, stepKey, status: "success", result };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(backoffMs[Math.min(attempt - 1, backoffMs.length - 1)] ?? 0);
      }
    }
  }

  const error = errorMessage(lastError);
  await db
    .updateTable("pipeline_job_step")
    .set({
      status: "failed",
      attempts: priorAttempts + maxAttempts,
      error,
      finished_at: new Date(),
    })
    .where("id", "=", id)
    .execute();
  return { runId, stepKey, status: "failed", error };
}

/**
 * Runs a single step from a manual button click: records it (trigger 'manual',
 * fresh run id, no dependencies, single attempt for immediate feedback) and
 * returns the result, or throws if it failed so the HTTP handler surfaces a 500.
 */
export async function runManualStep<T>(
  db: Kysely<DB>,
  stepKey: string,
  fn: (db: Kysely<DB>) => Promise<T>,
): Promise<T> {
  const r = await runStep(db, { stepKey, trigger: "manual", fn }, { maxAttempts: 1 });
  if (r.status !== "success") {
    throw new Error(r.error ?? `Step ${stepKey} ended ${r.status}`);
  }
  return r.result as T;
}

/** Insert a new step row or update an existing one (by id). Returns the row id. */
async function writeRow(
  db: Kysely<DB>,
  existingId: number | undefined,
  row: {
    runId: string;
    stepKey: string;
    trigger: StepTrigger;
    status: StepStatus;
    attempts: number;
    error: string | null;
    finished: boolean;
  },
): Promise<number> {
  if (existingId !== undefined) {
    // Keep the original trigger; just reset timing/status for the re-run.
    await db
      .updateTable("pipeline_job_step")
      .set({
        status: row.status,
        attempts: row.attempts,
        error: row.error,
        started_at: new Date(),
        finished_at: row.finished ? new Date() : null,
      })
      .where("id", "=", existingId)
      .execute();
    return existingId;
  }

  const inserted = await db
    .insertInto("pipeline_job_step")
    .values({
      run_id: row.runId,
      step_key: row.stepKey,
      trigger: row.trigger,
      status: row.status,
      attempts: row.attempts,
      error: row.error,
      // Set started_at from the same (JS) clock as finished_at. Relying on the
      // DB CURRENT_TIMESTAMP default mixes UTC-naive with the driver's local
      // wall-clock writes, inflating durations by the TZ offset.
      started_at: new Date(),
      finished_at: row.finished ? new Date() : null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return inserted.id;
}
