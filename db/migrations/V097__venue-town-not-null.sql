-- Every venue has a town, and the create-venue API has always required one, so
-- the column's nullability was only ever an accident of how the table was first
-- written. The town is what the regions point map groups and labels its dots by,
-- which has no sensible answer for a venue without one.
ALTER TABLE venue
    ALTER COLUMN town SET NOT NULL;
