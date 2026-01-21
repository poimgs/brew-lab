CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coffee_id UUID REFERENCES coffees(id) ON DELETE SET NULL,

    -- Basic info
    brew_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_notes TEXT NOT NULL,
    overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 10),

    -- Pre-brew parameters
    coffee_weight DECIMAL(6,2),
    water_weight DECIMAL(7,2),
    ratio DECIMAL(5,2),
    grind_size VARCHAR(50),
    water_temperature DECIMAL(5,2),
    filter_type VARCHAR(50),

    -- Brew parameters
    bloom_water DECIMAL(6,2),
    bloom_time INTEGER,
    pour_1 VARCHAR(100),
    pour_2 VARCHAR(100),
    pour_3 VARCHAR(100),
    total_brew_time INTEGER,
    drawdown_time INTEGER,
    technique_notes TEXT,

    -- Post-brew parameters
    serving_temperature DECIMAL(5,2),
    water_bypass DECIMAL(6,2),
    mineral_additions VARCHAR(100),

    -- Quantitative results
    final_weight DECIMAL(7,2),
    tds DECIMAL(4,2),
    extraction_yield DECIMAL(5,2),

    -- Sensory scores (1-10)
    aroma_intensity INTEGER CHECK (aroma_intensity >= 1 AND aroma_intensity <= 10),
    acidity_intensity INTEGER CHECK (acidity_intensity >= 1 AND acidity_intensity <= 10),
    sweetness_intensity INTEGER CHECK (sweetness_intensity >= 1 AND sweetness_intensity <= 10),
    bitterness_intensity INTEGER CHECK (bitterness_intensity >= 1 AND bitterness_intensity <= 10),
    body_weight INTEGER CHECK (body_weight >= 1 AND body_weight <= 10),
    aftertaste_duration INTEGER CHECK (aftertaste_duration >= 1 AND aftertaste_duration <= 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity >= 1 AND aftertaste_intensity <= 10),

    -- Sensory notes
    aroma_notes TEXT,
    flavor_notes TEXT,
    aftertaste_notes TEXT,

    -- Meta
    improvement_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_experiments_user_id ON experiments(user_id);
CREATE INDEX idx_experiments_coffee_id ON experiments(coffee_id);
CREATE INDEX idx_experiments_brew_date ON experiments(user_id, brew_date DESC);
CREATE INDEX idx_experiments_score ON experiments(user_id, overall_score) WHERE overall_score IS NOT NULL;
