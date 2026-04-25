CREATE TABLE team_ranking_snapshot_batch (
    id        SERIAL PRIMARY KEY,
    type_code TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE team_ranking_snapshot (
    batch_id     INTEGER          NOT NULL REFERENCES team_ranking_snapshot_batch (id),
    team_id      INTEGER          NOT NULL REFERENCES team (id),
    rank         INTEGER          NOT NULL,
    total_points DOUBLE PRECISION NOT NULL,
    rank_change  INTEGER,
    new_team     BOOLEAN          NOT NULL DEFAULT FALSE
);
