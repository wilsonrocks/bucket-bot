ALTER TABLE ranking_snapshot_type ADD COLUMN hex_code TEXT;
UPDATE ranking_snapshot_type SET hex_code = '#469a44' WHERE code = 'RESSERS';
UPDATE ranking_snapshot_type SET hex_code = '#cf1e24' WHERE code = 'GUILD';
UPDATE ranking_snapshot_type SET hex_code = '#0089c8' WHERE code = 'ARCANISTS';
UPDATE ranking_snapshot_type SET hex_code = '#cdae1c' WHERE code = 'OUTCASTS';
UPDATE ranking_snapshot_type SET hex_code = '#ee6626' WHERE code = 'THUNDERS';
UPDATE ranking_snapshot_type SET hex_code = '#8558a5' WHERE code = 'NEVERBORN';
UPDATE ranking_snapshot_type SET hex_code = '#996431' WHERE code = 'BAYOU';
UPDATE ranking_snapshot_type SET hex_code = '#009797' WHERE code = 'EXPLORER';
