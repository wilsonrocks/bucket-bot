-- GT and Nationals events were imported with the EVENT-tier maximum (120 for
-- 5+ rounds) because the importers ignored the chosen tier. Recalculate their
-- results with the tier maximums (GT 130, NATIONALS 140), mirroring
-- calculatePoints in backend/logic/points.ts. Events under 8 players award 0
-- and are left alone.
UPDATE result r
SET points = m.adjusted_max - (m.adjusted_max - 5.0) / (t.number_of_players - 1) * (r.place - 1)
FROM tourney t
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN t.number_of_players >= 16 THEN tier_max.points
         ELSE tier_max.points - (16 - t.number_of_players)
    END AS adjusted_max
  FROM (
    SELECT CASE t.tier_code WHEN 'GT' THEN 130 WHEN 'NATIONALS' THEN 140 END AS points
  ) tier_max
) m
WHERE r.tourney_id = t.id
  AND t.tier_code IN ('GT', 'NATIONALS')
  AND t.number_of_players >= 8;
