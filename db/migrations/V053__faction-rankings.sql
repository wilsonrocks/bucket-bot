CREATE TABLE faction_snapshot_batch (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE faction_snapshot (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES faction_snapshot_batch(id) ON DELETE CASCADE,
    faction_code TEXT REFERENCES faction(name_code) ON DELETE CASCADE,
    rank INT NOT NULL,
    total_points INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, faction_code)
);