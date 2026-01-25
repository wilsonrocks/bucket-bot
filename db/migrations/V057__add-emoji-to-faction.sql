ALTER TABLE faction ADD COLUMN emoji TEXT;

UPDATE faction SET emoji = '<:M3E_Bayou_Box_Icon:820260164187848705>' WHERE name_code = 'BAYOU';
UPDATE faction SET emoji = '<:M3E_Resurrectionists_Box_Icon:820260205525860362>' WHERE name_code = 'RESSERS';
UPDATE faction SET emoji = '<:M3E_ExplorersSociety_Box_Icon:820260389350670338>' WHERE name_code = 'EXPLORER';
UPDATE faction SET emoji = '<:M3E_TenThunders_Box_Icon:820260374531145728>' WHERE name_code = 'THUNDERS';
UPDATE faction SET emoji = '<:M3E_Outcasts_Box_Icon:820260355510108160>' WHERE name_code = 'OUTCASTS';
UPDATE faction SET emoji = '<:M3E_Arcanists_Box_Icon:820260141022052375>' WHERE name_code = 'ARCANISTS';
UPDATE faction SET emoji = '<:M3E_Guild_Box_Icon:820260178775638026>' WHERE name_code = 'GUILD';
UPDATE faction SET emoji = '<:M3E_Neverborn_Box_Icon:820260191366938625>' WHERE name_code = 'NEVERBORN';
