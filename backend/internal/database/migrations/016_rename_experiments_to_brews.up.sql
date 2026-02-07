-- Rename experiment_pours → brew_pours (must come before experiments rename since it references it)
ALTER TABLE experiment_pours RENAME TO brew_pours;
ALTER TABLE experiments RENAME TO brews;
ALTER TABLE coffees RENAME COLUMN best_experiment_id TO best_brew_id;
ALTER TABLE session_experiments RENAME TO session_brews;
ALTER TABLE session_brews RENAME COLUMN experiment_id TO brew_id;
ALTER TABLE brew_pours RENAME COLUMN experiment_id TO brew_id;

-- Rename indexes
ALTER INDEX IF EXISTS idx_experiments_user_id RENAME TO idx_brews_user_id;
ALTER INDEX IF EXISTS idx_experiments_coffee_id RENAME TO idx_brews_coffee_id;
ALTER INDEX IF EXISTS idx_experiments_brew_date RENAME TO idx_brews_brew_date;
ALTER INDEX IF EXISTS idx_experiment_pours_experiment_id RENAME TO idx_brew_pours_brew_id;
