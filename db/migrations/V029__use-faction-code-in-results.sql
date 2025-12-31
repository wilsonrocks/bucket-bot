ALTER TABLE result ADD COLUMN faction_code TEXT; -- can be nullable at this point

UPDATE result SET faction_code = (SELECT name_code FROM faction WHERE faction.id = result.faction_id);

ALTER TABLE result ALTER COLUMN faction_code SET NOT NULL;

ALTER TABLE result
ADD CONSTRAINT fk_result_faction_code
FOREIGN KEY (faction_code)
REFERENCES faction(name_code);

ALTER TABLE result DROP COLUMN faction_id;
