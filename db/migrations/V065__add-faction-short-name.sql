ALTER TABLE faction
ADD COLUMN short_name CHAR(3);

UPDATE faction
SET
    short_name = 'RES'
WHERE
    name_code = 'RESSERS';

UPDATE faction
SET
    short_name = 'GLD'
WHERE
    name_code = 'GUILD';

UPDATE faction
SET
    short_name = 'ARC'
WHERE
    name_code = 'ARCANISTS';

UPDATE faction
SET
    short_name = 'OC'
WHERE
    name_code = 'OUTCASTS';

UPDATE faction
SET
    short_name = 'TT'
WHERE
    name_code = 'THUNDERS';

UPDATE faction
SET
    short_name = 'NVB'
WHERE
    name_code = 'NEVERBORN';

UPDATE faction
SET
    short_name = 'BAY'
WHERE
    name_code = 'BAYOU';

UPDATE faction
SET
    short_name = 'EXS'
WHERE
    name_code = 'EXPLORER';

ALTER TABLE faction ADD UNIQUE (short_name);

ALTER TABLE faction ALTER COLUMN short_name SET NOT NULL;