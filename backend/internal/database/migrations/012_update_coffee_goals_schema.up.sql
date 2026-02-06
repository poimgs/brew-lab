-- Remove old sensory fields
ALTER TABLE coffee_goals DROP COLUMN acidity_intensity;
ALTER TABLE coffee_goals DROP COLUMN bitterness_intensity;
ALTER TABLE coffee_goals DROP COLUMN aftertaste_duration;
ALTER TABLE coffee_goals DROP COLUMN body_weight;

-- Add new sensory fields
ALTER TABLE coffee_goals ADD COLUMN body_intensity INTEGER CHECK (body_intensity BETWEEN 1 AND 10);
ALTER TABLE coffee_goals ADD COLUMN brightness_intensity INTEGER CHECK (brightness_intensity BETWEEN 1 AND 10);
ALTER TABLE coffee_goals ADD COLUMN cleanliness_intensity INTEGER CHECK (cleanliness_intensity BETWEEN 1 AND 10);
ALTER TABLE coffee_goals ADD COLUMN complexity_intensity INTEGER CHECK (complexity_intensity BETWEEN 1 AND 10);
ALTER TABLE coffee_goals ADD COLUMN balance_intensity INTEGER CHECK (balance_intensity BETWEEN 1 AND 10);
