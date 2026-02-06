-- Add coffee_ml column and drop notes column from coffee_goals
ALTER TABLE coffee_goals ADD COLUMN coffee_ml DECIMAL(6,2);
ALTER TABLE coffee_goals DROP COLUMN IF EXISTS notes;
