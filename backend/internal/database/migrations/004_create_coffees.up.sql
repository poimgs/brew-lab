CREATE TABLE coffees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    roaster VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    farm VARCHAR(255),
    process VARCHAR(100),
    roast_level VARCHAR(50),
    tasting_notes TEXT,
    roast_date DATE,
    notes TEXT,
    reference_brew_id UUID,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coffees_user_id ON coffees(user_id);
CREATE INDEX idx_coffees_roaster ON coffees(roaster);
CREATE INDEX idx_coffees_roast_date ON coffees(roast_date);
CREATE INDEX idx_coffees_archived_at ON coffees(archived_at) WHERE archived_at IS NULL;
