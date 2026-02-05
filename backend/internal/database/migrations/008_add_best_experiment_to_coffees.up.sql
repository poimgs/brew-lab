ALTER TABLE coffees
ADD COLUMN best_experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;

CREATE INDEX idx_coffees_best_experiment_id ON coffees(best_experiment_id);
