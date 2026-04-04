CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE membership
  ADD CONSTRAINT membership_no_overlapping_membership
  EXCLUDE USING gist (
    player_id WITH =,
    daterange(join_date, left_date) WITH &&
  );
