DROP TABLE ranking_snapshot_type CASCADE;

CREATE TABLE ranking_snapshot_type ( -- e.g. 'Masters' 'Best Resser'
    code TEXT PRIMARY KEY,
    description TEXT
);

INSERT INTO ranking_snapshot_type (code, description)
VALUES
    ('BEST_FOREVER', 'For dev testing purposes'),  
    ('BEST_RESSER', 'Best Resser Ranking');