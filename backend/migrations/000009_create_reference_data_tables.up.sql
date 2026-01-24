CREATE TABLE filter_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_filter_papers_user_id ON filter_papers(user_id);
CREATE UNIQUE INDEX idx_filter_papers_user_name ON filter_papers(user_id, name);

CREATE TABLE mineral_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    hardness DECIMAL(6,2),
    alkalinity DECIMAL(6,2),
    magnesium DECIMAL(6,2),
    calcium DECIMAL(6,2),
    potassium DECIMAL(6,2),
    sodium DECIMAL(6,2),
    chloride DECIMAL(6,2),
    sulfate DECIMAL(6,2),
    bicarbonate DECIMAL(6,2),
    typical_dose VARCHAR(100),
    taste_effects TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed predefined mineral profiles
INSERT INTO mineral_profiles (name, brand, hardness, alkalinity, magnesium, calcium, potassium, sodium, chloride, sulfate, bicarbonate, typical_dose, taste_effects) VALUES
('Catalyst', 'Lotus Coffee Products', 70.9, 15.0, 12.2, 8.2, 14.3, 3.9, 58.7, NULL, 18.3, '2 drops per cup', 'Increased body, enhanced sweetness'),
('Affinity', 'Lotus Coffee Products', 50.45, 12.18, 12.25, NULL, NULL, 16.51, 46.55, 8.15, 14.86, '2 drops per cup', 'Clarity, balanced acidity');
