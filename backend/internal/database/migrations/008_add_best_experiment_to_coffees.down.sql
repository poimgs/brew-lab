DROP INDEX IF EXISTS idx_coffees_best_experiment_id;
ALTER TABLE coffees DROP COLUMN IF EXISTS best_experiment_id;
