CREATE TABLE experiment_mapping_dismissals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    mapping_id UUID NOT NULL REFERENCES effect_mappings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_experiment_mapping_dismissal UNIQUE (experiment_id, mapping_id)
);

CREATE INDEX idx_dismissals_experiment_id ON experiment_mapping_dismissals(experiment_id);
CREATE INDEX idx_dismissals_user_id ON experiment_mapping_dismissals(user_id);
