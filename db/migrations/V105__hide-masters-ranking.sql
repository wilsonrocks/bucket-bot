-- Masters Qualifying is disabled: hide it from the site, Discord posts and
-- ranking-change DMs.
UPDATE ranking_snapshot_type SET display = false WHERE code = 'MASTERS';
