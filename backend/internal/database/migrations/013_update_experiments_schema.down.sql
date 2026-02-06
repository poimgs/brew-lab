-- Remove new sensory fields
ALTER TABLE experiments DROP COLUMN balance_notes;
ALTER TABLE experiments DROP COLUMN balance_intensity;
ALTER TABLE experiments DROP COLUMN complexity_notes;
ALTER TABLE experiments DROP COLUMN complexity_intensity;
ALTER TABLE experiments DROP COLUMN cleanliness_notes;
ALTER TABLE experiments DROP COLUMN cleanliness_intensity;
ALTER TABLE experiments DROP COLUMN brightness_notes;
ALTER TABLE experiments DROP COLUMN brightness_intensity;

-- Restore old sensory fields
ALTER TABLE experiments ADD COLUMN aftertaste_duration INTEGER CHECK (aftertaste_duration BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN bitterness_notes TEXT;
ALTER TABLE experiments ADD COLUMN bitterness_intensity INTEGER CHECK (bitterness_intensity BETWEEN 1 AND 10);
ALTER TABLE experiments ADD COLUMN acidity_notes TEXT;
ALTER TABLE experiments ADD COLUMN acidity_intensity INTEGER CHECK (acidity_intensity BETWEEN 1 AND 10);

-- Rename body_intensity back to body_weight
ALTER TABLE experiments RENAME COLUMN body_intensity TO body_weight;

-- Remove is_draft column
ALTER TABLE experiments DROP COLUMN is_draft;

-- Rename coffee_ml back to final_weight
ALTER TABLE experiments RENAME COLUMN coffee_ml TO final_weight;
