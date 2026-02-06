-- Rename final_weight to coffee_ml
ALTER TABLE experiments RENAME COLUMN final_weight TO coffee_ml;

-- Add is_draft column
ALTER TABLE experiments ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;

-- Rename body_weight to body_intensity
ALTER TABLE experiments RENAME COLUMN body_weight TO body_intensity;

-- Remove old sensory fields
ALTER TABLE experiments DROP COLUMN acidity_intensity;
ALTER TABLE experiments DROP COLUMN acidity_notes;
ALTER TABLE experiments DROP COLUMN bitterness_intensity;
ALTER TABLE experiments DROP COLUMN bitterness_notes;
ALTER TABLE experiments DROP COLUMN aftertaste_duration;

-- Add new sensory fields
ALTER TABLE experiments ADD COLUMN brightness_intensity INTEGER CHECK (brightness_intensity BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN brightness_notes TEXT;
ALTER TABLE experiments ADD COLUMN cleanliness_intensity INTEGER CHECK (cleanliness_intensity BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN cleanliness_notes TEXT;
ALTER TABLE experiments ADD COLUMN complexity_intensity INTEGER CHECK (complexity_intensity BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN complexity_notes TEXT;
ALTER TABLE experiments ADD COLUMN balance_intensity INTEGER CHECK (balance_intensity BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN balance_notes TEXT;
