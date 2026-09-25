-- Deleting a tourney was blocked by ranking_snapshot_event, the only FK to
-- tourney without an ON DELETE action. Cascade like result and
-- painting_category do. Re-adding it also renames the constraint to match the
-- tourney_id column (renamed from event_id in V042).
ALTER TABLE ranking_snapshot_event
    DROP CONSTRAINT ranking_snapshot_event_event_id_fkey,
    ADD CONSTRAINT ranking_snapshot_event_tourney_id_fkey
        FOREIGN KEY (tourney_id) REFERENCES tourney(id) ON DELETE CASCADE;
