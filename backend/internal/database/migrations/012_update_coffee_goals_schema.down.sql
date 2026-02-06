-- Remove new sensory fields
ALTER TABLE coffee_goals DROP COLUMN body_intensity;
ALTER TABLE coffee_goals DROP COLUMN brightness_intensity;
ALTER TABLE coffee_goals DROP COLUMN cleanliness_intensity;
ALTER TABLE coffee_goals DROP COLUMN complexity_intensity;
ALTER TABLE coffee_goals DROP COLUMN balance_intensity;

-- Add back old sensory fields
ALTER TABLE coffee_goals ADD COLUMN acidity_intensity INTEGER CHECK (acidity_intensity BETWEEN 1 AND 10);
ALTER TABLE coffee_goals ADD COLUMN bitterness_intensity INTEGER CHECK (bitterness_intensity BETWEEN 1 AND 10);
ALTER TABLE coffee_goals ADD COLUMN aftertaste_duration INTEGER CHECK (aftertaste_duration BETWEEN 1 AND 10);
ALTER TABLE coffee_goals ADD COLUMN body_weight INTEGER CHECK (body_weight BETWEEN 1 AND 10);
