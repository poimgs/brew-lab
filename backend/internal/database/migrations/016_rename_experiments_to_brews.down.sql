-- Reverse all renames
ALTER TABLE brew_pours RENAME COLUMN brew_id TO experiment_id;
ALTER TABLE session_brews RENAME COLUMN brew_id TO experiment_id;
ALTER TABLE session_brews RENAME TO session_experiments;
ALTER TABLE coffees RENAME COLUMN best_brew_id TO best_experiment_id;
ALTER TABLE brews RENAME TO experiments;
ALTER TABLE brew_pours RENAME TO experiment_pours;

-- Rename indexes back
ALTER INDEX IF EXISTS idx_brews_user_id RENAME TO idx_experiments_user_id;
ALTER INDEX IF EXISTS idx_brews_coffee_id RENAME TO idx_experiments_coffee_id;
ALTER INDEX IF EXISTS idx_brews_brew_date RENAME TO idx_experiments_brew_date;
ALTER INDEX IF EXISTS idx_brew_pours_brew_id RENAME TO idx_experiment_pours_experiment_id;
