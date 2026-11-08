-- NATIONALS events were imported with the standard rounds-based max points (the
-- importers ignored the tier). Recalculate them with the NATIONALS max of 130, still
-- reduced by 1 per player under 16. GT events are left alone: GT's max (120) equals
-- what they were imported with.
--
-- Mirrors calculatePoints() in backend/logic/points.ts, which interpolates as
--   (max * (n - 1 - i) + 5 * i) / (n - 1)
-- The numerator is an exact integer, so doing this in float8 (not numeric) gives
-- bit-identical results to JS: first place exactly max, last place exactly 5.
UPDATE result r
SET points = (calc.max_adj * (calc.n - r.place) + 5::float8 * (r.place - 1)) / (calc.n - 1)
FROM (
    SELECT
        t.id,
        t.number_of_players AS n,
        (130 - GREATEST(16 - t.number_of_players, 0))::float8 AS max_adj
    FROM tourney t
    WHERE t.tier_code = 'NATIONALS'
      AND t.number_of_players >= 8
) calc
WHERE r.tourney_id = calc.id
  AND r.place IS NOT NULL;
