CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variable_tested VARCHAR(255) NOT NULL,
    hypothesis TEXT,
    conclusion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE session_experiments (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, experiment_id)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_coffee_id ON sessions(coffee_id);
CREATE INDEX idx_session_experiments_experiment_id ON session_experiments(experiment_id);
