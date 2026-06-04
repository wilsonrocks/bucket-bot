import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { runPipeline, retryPipelineSteps } from "../../../logic/pipeline/rankings-pipeline.js";

const PipelineJobStepSchema = z.object({
  id: z.number(),
  run_id: z.string(),
  step_key: z.string(),
  trigger: z.string(),
  status: z.string(),
  attempts: z.number(),
  error: z.string().nullable(),
  started_at: z.string(),
  finished_at: z.string().nullable(),
});

// ── GET /pipeline-job-steps ────────────────────────────────────────────────

export const pipelineJobStepsRoute = createRoute({
  method: "get",
  path: "/pipeline-job-steps",
  request: {
    query: z.object({ limit: z.coerce.number().int().positive().max(1000).optional() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PipelineJobStepSchema) } },
      description: "Recent pipeline job steps, newest first",
    },
  },
});

export const pipelineJobStepsHandler: RouteHandler<typeof pipelineJobStepsRoute, AppEnv> = async (c) => {
  const { limit } = c.req.valid("query");
  const rows = await c
    .get("db")
    .selectFrom("pipeline_job_step")
    .selectAll()
    .orderBy("started_at", "desc")
    .orderBy("id", "desc")
    .limit(limit ?? 100)
    .execute();

  return c.json(rows as any, 200);
};

// ── POST /run-rankings-pipeline ────────────────────────────────────────────

export const runPipelineRoute = createRoute({
  method: "post",
  path: "/run-rankings-pipeline",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ runId: z.string() }) } },
      description: "Pipeline run started and completed",
    },
    409: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "A pipeline run is already in progress",
    },
  },
});

export const runPipelineHandler: RouteHandler<typeof runPipelineRoute, AppEnv> = async (c) => {
  try {
    const { runId } = await runPipeline(c.get("db"), "manual");
    return c.json({ runId }, 200);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already running")) {
      return c.json({ error: err.message }, 409);
    }
    throw err;
  }
};

// ── POST /retry-pipeline-steps ─────────────────────────────────────────────

export const retryPipelineStepsRoute = createRoute({
  method: "post",
  path: "/retry-pipeline-steps",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ runId: z.string(), stepKeys: z.array(z.string()).min(1) }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ runId: z.string() }) } },
      description: "Selected steps re-run",
    },
  },
});

export const retryPipelineStepsHandler: RouteHandler<typeof retryPipelineStepsRoute, AppEnv> = async (c) => {
  const { runId, stepKeys } = c.req.valid("json");
  await retryPipelineSteps(c.get("db"), runId, stepKeys);
  return c.json({ runId }, 200);
};
