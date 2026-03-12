ALTER TABLE faction_snapshot
ADD COLUMN declaration_rate FLOAT;

UPDATE faction_snapshot fs
SET declaration_rate = declarations::float /
  (
    SELECT SUM(declarations)
    FROM faction_snapshot
    WHERE batch_id = fs.batch_id
  );


ALTER TABLE faction_snapshot
ALTER COLUMN declaration_rate SET NOT NULL;