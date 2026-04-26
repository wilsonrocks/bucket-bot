ALTER TABLE team_ranking_snapshot
  ADD COLUMN player_count INTEGER,
  ADD COLUMN event_count  INTEGER;

DO $$
DECLARE
  tb           RECORD;
  cutoff_date  DATE;
  extra_where  TEXT;
BEGIN
  FOR tb IN
    SELECT id, type_code, created_at
    FROM   team_ranking_snapshot_batch
    ORDER  BY created_at ASC
  LOOP
    cutoff_date := tb.created_at::date - INTERVAL '1 year';

    extra_where := CASE tb.type_code
      WHEN 'MASTERS'        THEN 'AND t.number_of_players >= 8'
      WHEN 'BEST_RESSER'    THEN $w$AND f.name_code = 'RESSERS'$w$
      WHEN 'BEST_GUILD'     THEN $w$AND f.name_code = 'GUILD'$w$
      WHEN 'BEST_ARCANIST'  THEN $w$AND f.name_code = 'ARCANISTS'$w$
      WHEN 'BEST_OUTCAST'   THEN $w$AND f.name_code = 'OUTCASTS'$w$
      WHEN 'BEST_THUNDERS'  THEN $w$AND f.name_code = 'THUNDERS'$w$
      WHEN 'BEST_NEVERBORN' THEN $w$AND f.name_code = 'NEVERBORN'$w$
      WHEN 'BEST_BAYOU'     THEN $w$AND f.name_code = 'BAYOU'$w$
      WHEN 'BEST_EXPLORERS' THEN $w$AND f.name_code = 'EXPLORER'$w$
      ELSE ''
    END;

    EXECUTE format($sql$
      WITH counts AS (
        SELECT team_id,
               count(*)                  AS player_count,
               sum(events_for_player)    AS event_count
        FROM (
          SELECT team_id,
                 player_id,
                 count(*)                                                           AS events_for_player,
                 row_number() OVER (PARTITION BY team_id ORDER BY sum(points) DESC) AS player_rn
          FROM (
            SELECT m.team_id,
                   p.id       AS player_id,
                   r.points,
                   row_number() OVER (
                     PARTITION BY m.team_id, p.id
                     ORDER BY r.points DESC
                   )           AS rn
            FROM   player          p
            JOIN   player_identity pident ON p.id         = pident.player_id
            JOIN   result          r      ON pident.id    = r.player_identity_id
            JOIN   tourney         t      ON r.tourney_id = t.id
            JOIN   faction         f      ON r.faction_code = f.name_code
            JOIN   membership      m      ON m.player_id  = p.id
                                         AND t.date >= m.join_date
                                         AND (m.left_date IS NULL OR t.date < m.left_date)
            WHERE  t.date >= $2
              AND  t.date <= $3
            %s
          ) raw
          WHERE rn <= 5
          GROUP BY team_id, player_id
        ) contributions
        WHERE player_rn <= 5
        GROUP BY team_id
      )
      UPDATE team_ranking_snapshot trs
      SET    player_count = counts.player_count,
             event_count  = counts.event_count
      FROM   counts
      WHERE  trs.batch_id = $1
        AND  trs.team_id  = counts.team_id
    $sql$, extra_where)
    USING tb.id, cutoff_date, tb.created_at::date;

  END LOOP;
END $$;
