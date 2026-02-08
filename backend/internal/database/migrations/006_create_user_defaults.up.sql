CREATE TABLE user_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    default_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, field_name)
);

CREATE INDEX idx_user_defaults_user_id ON user_defaults(user_id);

CREATE TABLE user_pour_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pour_number INTEGER NOT NULL,
    water_amount DECIMAL(6,1),
    pour_style VARCHAR(50),
    wait_time INTEGER,
    UNIQUE(user_id, pour_number)
);

CREATE INDEX idx_user_pour_defaults_user_id ON user_pour_defaults(user_id);
