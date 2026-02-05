CREATE TABLE IF NOT EXISTS coffee_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coffee_id UUID NOT NULL UNIQUE REFERENCES coffees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Target quantitative outcomes
    tds DECIMAL(4,2),
    extraction_yield DECIMAL(5,2),

    -- Target sensory outcomes (1-10 scale)
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    acidity_intensity INTEGER CHECK (acidity_intensity BETWEEN 1 AND 10),
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    bitterness_intensity INTEGER CHECK (bitterness_intensity BETWEEN 1 AND 10),
    body_weight INTEGER CHECK (body_weight BETWEEN 1 AND 10),
    flavor_intensity INTEGER CHECK (flavor_intensity BETWEEN 1 AND 10),
    aftertaste_duration INTEGER CHECK (aftertaste_duration BETWEEN 1 AND 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),

    -- Notes for achieving goals
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coffee_goals_coffee_id ON coffee_goals(coffee_id);
CREATE INDEX idx_coffee_goals_user_id ON coffee_goals(user_id);
