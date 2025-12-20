CREATE TABLE ranking_snapshot_type ( -- e.g. 'Masters' 'Best Resser'
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE ranking_snapshot_batch ( -- e.g. 'after Nationals, weekly, manual'
    id SERIAL PRIMARY KEY,
    type_id INTEGER NOT NULL
        REFERENCES ranking_snapshot_type(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

CREATE TABLE ranking_snapshot (
    batch_id INTEGER NOT NULL
        REFERENCES ranking_snapshot_batch(id)
        ON DELETE CASCADE,

    player_id INTEGER NOT NULL
        REFERENCES player(id),

    rank INTEGER NOT NULL,
    total_points INTEGER NOT NULL,

    PRIMARY KEY (batch_id, player_id)
);

CREATE TABLE ranking_snapshot_event (
    batch_id INTEGER NOT NULL
        REFERENCES ranking_snapshot_batch(id)
        ON DELETE CASCADE,

    player_id INTEGER NOT NULL
        REFERENCES player(id),

    event_id INTEGER NOT NULL
        REFERENCES tourney(id),

    points INTEGER NOT NULL,

    position INTEGER NOT NULL, -- 1 = best score, 2 = second-best, etc

    PRIMARY KEY (batch_id, player_id, event_id),

    CONSTRAINT ranking_snapshot_event_position_chk
        CHECK (position > 0)
);
