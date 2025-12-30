ALTER TABLE faction ADD COLUMN name_code TEXT UNIQUE;

UPDATE faction set name_code = 'RESSERS' WHERE name = 'Resurrectionists';
UPDATE faction set name_code = 'GUILD' WHERE name = 'Guild';
UPDATE faction set name_code = 'ARCANISTS' WHERE name = 'Arcanists';
UPDATE faction set name_code = 'OUTCASTS' WHERE name = 'Outcasts';
UPDATE faction set name_code = 'THUNDERS' WHERE name = 'Ten Thunders';
UPDATE faction set name_code = 'NEVERBORN' WHERE name = 'Neverborn';
UPDATE faction set name_code = 'BAYOU' WHERE name = 'Bayou';
UPDATE faction set name_code = 'EXPLORER' WHERE name = 'Explorer''s Society';

ALTER TABLE faction
    ALTER COLUMN name_code SET NOT NULL;
