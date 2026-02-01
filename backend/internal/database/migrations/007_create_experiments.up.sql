CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE RESTRICT,
    brew_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Pre-brew variables
    coffee_weight DECIMAL(5,2),
    water_weight DECIMAL(6,2),
    ratio DECIMAL(4,1),
    grind_size DECIMAL(4,1),
    water_temperature DECIMAL(4,1),
    filter_paper_id UUID REFERENCES filter_papers(id),

    -- Brew variables
    bloom_water DECIMAL(5,2),
    bloom_time INTEGER,
    total_brew_time INTEGER,
    drawdown_time INTEGER,
    technique_notes TEXT,

    -- Post-brew variables
    serving_temperature VARCHAR(20),
    water_bypass VARCHAR(100),
    mineral_additions VARCHAR(255),

    -- Quantitative outcomes
    final_weight DECIMAL(6,2),
    tds DECIMAL(4,2),
    extraction_yield DECIMAL(5,2),

    -- Sensory outcomes (1-10 scale)
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    aroma_notes TEXT,
    acidity_intensity INTEGER CHECK (acidity_intensity BETWEEN 1 AND 10),
    acidity_notes TEXT,
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    sweetness_notes TEXT,
    bitterness_intensity INTEGER CHECK (bitterness_intensity BETWEEN 1 AND 10),
    bitterness_notes TEXT,
    body_weight INTEGER CHECK (body_weight BETWEEN 1 AND 10),
    body_notes TEXT,
    flavor_intensity INTEGER CHECK (flavor_intensity BETWEEN 1 AND 10),
    flavor_notes TEXT,
    aftertaste_duration INTEGER CHECK (aftertaste_duration BETWEEN 1 AND 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),
    aftertaste_notes TEXT,

    -- Overall assessment
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
    overall_notes TEXT NOT NULL,
    improvement_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_pours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    pour_number INTEGER NOT NULL,
    water_amount DECIMAL(5,2),
    pour_style VARCHAR(50),
    notes TEXT,
    UNIQUE(experiment_id, pour_number)
);

CREATE INDEX idx_experiments_user_id ON experiments(user_id);
CREATE INDEX idx_experiments_coffee_id ON experiments(coffee_id);
CREATE INDEX idx_experiments_brew_date ON experiments(brew_date);
CREATE INDEX idx_experiments_filter_paper_id ON experiments(filter_paper_id);
CREATE INDEX idx_experiment_pours_experiment_id ON experiment_pours(experiment_id);
