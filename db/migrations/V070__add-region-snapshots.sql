CREATE TABLE region_snapshot_batch (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE region_snapshot (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES region_snapshot_batch(id) ON DELETE CASCADE,
    region_id INTEGER NOT NULL REFERENCES region(id),
    event_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, region_id)
);

-- Backfill historical data from existing ranking snapshot batches.
-- For each ROLLING_YEAR ranking batch, create a region batch with the same
-- timestamp and calculate event counts for the rolling 12-month window ending
-- at that point in time.
WITH source_batches AS (
    SELECT DISTINCT created_at
    FROM ranking_snapshot_batch
    WHERE type_code = 'ROLLING_YEAR'
    ORDER BY created_at
),
inserted_batches AS (
    INSERT INTO region_snapshot_batch (created_at)
    SELECT created_at FROM source_batches
    RETURNING id, created_at
)
INSERT INTO region_snapshot (batch_id, region_id, event_count)
SELECT
    ib.id,
    r.id,
    COUNT(t.id)
FROM inserted_batches ib
CROSS JOIN region r
LEFT JOIN venue v ON v.region_id = r.id
LEFT JOIN tourney t ON
    t.venue_id = v.id
    AND t.date >= (ib.created_at - INTERVAL '1 year')::date
    AND t.date <= ib.created_at::date
GROUP BY ib.id, r.id, ib.created_at;
