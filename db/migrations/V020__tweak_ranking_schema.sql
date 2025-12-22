ALTER TABLE ranking_snapshot_batch DROP COLUMN type_id;
ALTER TABLE ranking_snapshot_batch ADD COLUMN type_code TEXT NOT NULL;
ALTER TABLE ranking_snapshot_batch
    ADD CONSTRAINT fk_type_code
    FOREIGN KEY (type_code)
    REFERENCES ranking_snapshot_type(code);
