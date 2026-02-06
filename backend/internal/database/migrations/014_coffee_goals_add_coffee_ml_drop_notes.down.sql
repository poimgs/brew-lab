-- Reverse: drop coffee_ml column, add notes column back
ALTER TABLE coffee_goals DROP COLUMN IF EXISTS coffee_ml;
ALTER TABLE coffee_goals ADD COLUMN notes TEXT;
