CREATE TYPE roast_level AS ENUM ('Light', 'Medium', 'Medium-Dark', 'Dark');

CREATE TABLE coffees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roaster VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(100),
    process VARCHAR(100),
    roast_level roast_level,
    tasting_notes TEXT,
    roast_date DATE,
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_coffees_roaster ON coffees(user_id, roaster);
CREATE INDEX idx_coffees_country ON coffees(user_id, country);
CREATE INDEX idx_coffees_roast_date ON coffees(user_id, roast_date DESC);
CREATE INDEX idx_coffees_search ON coffees USING GIN (
    to_tsvector('english', coalesce(roaster, '') || ' ' || coalesce(name, ''))
);
