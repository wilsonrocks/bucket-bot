ALTER TABLE ranking_snapshot_type ADD COLUMN name TEXT;

UPDATE ranking_snapshot_type SET name = 'Rolling Year' WHERE code= 'ROLLING_YEAR';
UPDATE ranking_snapshot_type SET name = 'Masters Qualifying' WHERE code = 'MASTERS';
UPDATE ranking_snapshot_type SET name = 'Best Guild' WHERE code = 'BEST_GUILD';
UPDATE ranking_snapshot_type SET name = 'Best Arcanist' WHERE code = 'BEST_ARCANIST';
UPDATE ranking_snapshot_type SET name = 'Best Outcast' WHERE code = 'BEST_OUTCAST';
UPDATE ranking_snapshot_type SET name = 'Best Thunders' WHERE code = 'BEST_THUNDERS';
UPDATE ranking_snapshot_type SET name = 'Best Neverborn' WHERE code = 'BEST_NEVERBORN';
UPDATE ranking_snapshot_type SET name = 'Best Bayou' WHERE code = 'BEST_BAYOU';
UPDATE ranking_snapshot_type SET name = 'Best Explorers' WHERE code = 'BEST_EXPLORERS';
UPDATE ranking_snapshot_type SET name = 'Best Resser' WHERE code = 'BEST_RESSER';
UPDATE ranking_snapshot_type SET name = 'Best Forever' WHERE code = 'BEST_FOREVER';

ALTER TABLE ranking_snapshot_type ALTER COLUMN name SET NOT NULL;