DO $$
DECLARE
  pb           RECORD;
  new_batch_id INTEGER;
  cutoff_date  DATE;
  extra_where  TEXT;
BEGIN
  FOR pb IN
    SELECT rsb.id AS player_batch_id,
           rsb.type_code,
           rsb.created_at
    FROM   ranking_snapshot_batch rsb
    JOIN   ranking_snapshot_type  rst ON rsb.type_code = rst.code
    WHERE  rst.generate = true
      AND  rsb.type_code != 'BEST_FOREVER'
    ORDER  BY rsb.created_at ASC
  LOOP
    -- One year before this snapshot was taken
    cutoff_date := pb.created_at::date - INTERVAL '1 year';

    -- Ranking-type-specific extra filter
    extra_where := CASE pb.type_code
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

    INSERT INTO team_ranking_snapshot_batch (type_code, created_at)
    VALUES (pb.type_code, pb.created_at)
    RETURNING id INTO new_batch_id;

    -- Three-layer query:
    --   Layer 1: all qualifying results joined to historical membership,
    --            row-numbered per (team, player) to pick top N results
    --   Layer 2: sum per (team, player) = player contribution,
    --            row-numbered per team to pick top N players
    --   Layer 3: sum top N player contributions per team, rank teams
    EXECUTE format($sql$
      INSERT INTO team_ranking_snapshot (batch_id, team_id, rank, total_points)
      SELECT $1,
             team_id,
             rank() OVER (ORDER BY sum(player_contribution) DESC),
             sum(player_contribution)
      FROM (
        SELECT team_id,
               player_id,
               sum(points)                                                        AS player_contribution,
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
          JOIN   player_identity pident ON p.id        = pident.player_id
          JOIN   result          r      ON pident.id   = r.player_identity_id
          JOIN   tourney         t      ON r.tourney_id = t.id
          JOIN   faction         f      ON r.faction_code = f.name_code
          JOIN   membership      m      ON m.player_id = p.id
                                       AND t.date >= m.join_date
                                       AND (m.left_date IS NULL OR t.date < m.left_date)
          WHERE  t.date >= $2
          %s
        ) raw
        WHERE rn <= 5
        GROUP BY team_id, player_id
      ) contributions
      WHERE player_rn <= 5
      GROUP BY team_id
    $sql$, extra_where)
    USING new_batch_id, cutoff_date;

    -- rank_change: difference from previous batch of the same type
    UPDATE team_ranking_snapshot trs
    SET    rank_change = prev.rank - trs.rank
    FROM   team_ranking_snapshot      prev
    JOIN   team_ranking_snapshot_batch prev_b ON prev.batch_id = prev_b.id
    WHERE  trs.batch_id = new_batch_id
      AND  prev_b.id = (
             SELECT MAX(id) FROM team_ranking_snapshot_batch
             WHERE  type_code = pb.type_code AND id < new_batch_id
           )
      AND  prev.team_id = trs.team_id;

    -- new_team: true when this team has never appeared before in this type
    UPDATE team_ranking_snapshot trs
    SET    new_team = NOT EXISTS (
             SELECT 1
             FROM   team_ranking_snapshot      prior
             JOIN   team_ranking_snapshot_batch prior_b ON prior.batch_id = prior_b.id
             WHERE  prior.team_id       = trs.team_id
               AND  prior_b.type_code   = pb.type_code
               AND  prior.batch_id      < new_batch_id
           )
    WHERE  trs.batch_id = new_batch_id;

  END LOOP;
END $$;
