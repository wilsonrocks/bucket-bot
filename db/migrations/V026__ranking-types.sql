ALTER TABLE ranking_snapshot_type
    ADD COLUMN generate BOOLEAN DEFAULT TRUE,
    ADD COLUMN display BOOLEAN DEFAULT TRUE;

INSERT INTO ranking_snapshot_type (code, description) VALUES (
    'BEST_GUILD', 'Sum of best 5 event scores where Guild was declared.'
), (
    'BEST_ARCANIST', 'Sum of best 5 event scores regardless of faction.'
), ('BEST_OUTCAST', 'Sum of best 5 event scores where Outcasts were declared.'),
('BEST_THUNDERS', 'Sum of best 5 event scores where Ten Thunders were declared.'
), ('BEST_NEVERBORN', 'Sum of best 5 event scores where Neverborn were declared.'
), ('BEST_BAYOU', 'Sum of best 5 event scores where Bayou were declared.'
),('BEST_EXPLORERS', 'Sum of best 5 event scores where Explorer''s Society were declared.'
);

INSERT INTO ranking_snapshot_type (code, description) VALUES (
    'MASTERS', 'Sum of best 5 event scores from the current calendar year with 12 or more players.'
);

UPDATE ranking_snapshot_type SET description = 'Sum of best 5 event scores where Resurrectionists were declared.' WHERE code = 'BEST_RESSER';