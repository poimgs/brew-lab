-- Restore serving_temperature column
ALTER TABLE experiments ADD COLUMN serving_temperature VARCHAR(20);

-- Restore water_bypass as VARCHAR
DROP INDEX IF EXISTS idx_experiments_mineral_profile_id;
ALTER TABLE experiments DROP COLUMN IF EXISTS water_bypass_ml;
ALTER TABLE experiments ADD COLUMN water_bypass VARCHAR(100);

-- Restore mineral_additions as VARCHAR
ALTER TABLE experiments DROP COLUMN IF EXISTS mineral_profile_id;
ALTER TABLE experiments ADD COLUMN mineral_additions VARCHAR(255);
