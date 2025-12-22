ALTER TABLE ranking_snapshot
    ALTER COLUMN total_points TYPE FLOAT USING total_points::FLOAT;