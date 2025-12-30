UPDATE ranking_snapshot_type SET generate = FALSE, display = FALSE WHERE code = 'BEST_FOREVER';

INSERT INTO ranking_snapshot_type (code, description) VALUES (
    'ROLLING_YEAR', 'Sum of best 5 event scores from the last year.'
);