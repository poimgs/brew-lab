CREATE TABLE brews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
    brew_date DATE NOT NULL DEFAULT CURRENT_DATE,
    days_off_roast INTEGER,

    -- Setup variables
    coffee_weight DECIMAL(5,2),
    ratio DECIMAL(4,1),
    grind_size DECIMAL(4,1),
    water_temperature DECIMAL(4,1),
    filter_paper_id UUID REFERENCES filter_papers(id),

    -- Brewing variables
    total_brew_time INTEGER,
    technique_notes TEXT,

    -- Quantitative outcomes
    coffee_ml DECIMAL(6,2),
    tds DECIMAL(4,2),

    -- Sensory outcomes (1-10 scale, 6 attributes)
    aroma_intensity INTEGER CHECK (aroma_intensity BETWEEN 1 AND 10),
    body_intensity INTEGER CHECK (body_intensity BETWEEN 1 AND 10),
    sweetness_intensity INTEGER CHECK (sweetness_intensity BETWEEN 1 AND 10),
    brightness_intensity INTEGER CHECK (brightness_intensity BETWEEN 1 AND 10),
    complexity_intensity INTEGER CHECK (complexity_intensity BETWEEN 1 AND 10),
    aftertaste_intensity INTEGER CHECK (aftertaste_intensity BETWEEN 1 AND 10),

    -- Overall assessment
    overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
    overall_notes TEXT,
    improvement_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE brew_pours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brew_id UUID NOT NULL REFERENCES brews(id) ON DELETE CASCADE,
    pour_number INTEGER NOT NULL,
    water_amount DECIMAL(5,2),
    pour_style VARCHAR(50),
    wait_time INTEGER,
    UNIQUE(brew_id, pour_number)
);

CREATE INDEX idx_brews_user_id ON brews(user_id);
CREATE INDEX idx_brews_coffee_id ON brews(coffee_id);
CREATE INDEX idx_brews_brew_date ON brews(brew_date);
CREATE INDEX idx_brew_pours_brew_id ON brew_pours(brew_id);

-- Add FK from coffees.reference_brew_id to brews.id
ALTER TABLE coffees
    ADD CONSTRAINT fk_coffees_reference_brew
    FOREIGN KEY (reference_brew_id) REFERENCES brews(id) ON DELETE SET NULL;
