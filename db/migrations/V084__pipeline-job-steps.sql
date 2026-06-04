-- Tracks the outcome of each step of the weekly rankings pipeline (and ad-hoc
-- manual triggers). Flat per-step rows grouped by run_id so the admin UI can
-- show a timeline per run and we can record which steps failed/were skipped.

CREATE TABLE public.pipeline_job_step (
    id          serial PRIMARY KEY,
    run_id      text      NOT NULL,                              -- groups steps of one run
    step_key    text      NOT NULL,
    trigger     text      NOT NULL,                              -- 'scheduled' | 'manual'
    status      text      NOT NULL,                              -- 'running' | 'success' | 'failed' | 'skipped'
    attempts    integer   NOT NULL DEFAULT 0,
    error       text,
    started_at  timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at timestamp without time zone
);

CREATE INDEX pipeline_job_step_run_id_idx ON public.pipeline_job_step (run_id);
CREATE INDEX pipeline_job_step_started_at_idx ON public.pipeline_job_step (started_at DESC);
