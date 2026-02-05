-- Remove serving_temperature column
ALTER TABLE experiments DROP COLUMN IF EXISTS serving_temperature;

-- Change water_bypass from VARCHAR to INTEGER (ml)
-- First drop the old column, then add the new one
ALTER TABLE experiments DROP COLUMN IF EXISTS water_bypass;
ALTER TABLE experiments ADD COLUMN water_bypass_ml INTEGER;

-- Change mineral_additions to mineral_profile_id FK
ALTER TABLE experiments DROP COLUMN IF EXISTS mineral_additions;
ALTER TABLE experiments ADD COLUMN mineral_profile_id UUID REFERENCES mineral_profiles(id);
CREATE INDEX IF NOT EXISTS idx_experiments_mineral_profile_id ON experiments(mineral_profile_id);
