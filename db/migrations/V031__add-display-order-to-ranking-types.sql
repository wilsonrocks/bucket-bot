-- 1. Add the new column (nullable for now)
ALTER TABLE ranking_snapshot_type
ADD COLUMN display_order integer;

-- 2. Populate the column for rows where display = true
-- Example: just assign sequential numbers based on code or any logic you like
UPDATE ranking_snapshot_type
SET display_order = 1 WHERE code = 'ROLLING_YEAR';

UPDATE ranking_snapshot_type
SET display_order = 2 WHERE code = 'MASTERS';


UPDATE ranking_snapshot_type
SET display_order = 4 WHERE code = 'BEST_RESSER';
UPDATE ranking_snapshot_type
SET display_order = 3 WHERE code = 'BEST_GUILD';
UPDATE ranking_snapshot_type        
SET display_order = 5 WHERE code = 'BEST_ARCANIST';
UPDATE ranking_snapshot_type        
SET display_order = 7 WHERE code = 'BEST_OUTCAST';
UPDATE ranking_snapshot_type        
SET display_order = 9 WHERE code = 'BEST_THUNDERS';
UPDATE ranking_snapshot_type    
SET display_order = 6 WHERE code = 'BEST_NEVERBORN';
UPDATE ranking_snapshot_type    
SET display_order = 8 WHERE code = 'BEST_BAYOU';
UPDATE ranking_snapshot_type    
SET display_order = 10 WHERE code = 'BEST_EXPLORERS';   
  

-- 3. Create a unique index only for rows where display = true
CREATE UNIQUE INDEX unique_display_order_true
ON ranking_snapshot_type(display_order)
WHERE display = true;
