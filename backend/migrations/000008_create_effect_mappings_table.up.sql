-- Effect Mappings: User-defined knowledge system for brewing cause-effect relationships
-- Parent table: effect_mappings
CREATE TABLE effect_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variable VARCHAR(50) NOT NULL CHECK (variable IN (
        'temperature', 'ratio', 'grind_size', 'bloom_time',
        'total_brew_time', 'coffee_weight', 'pour_count',
        'pour_technique', 'filter_type'
    )),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('increase', 'decrease')),
    tick_description VARCHAR(100) NOT NULL,
    source VARCHAR(255),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child table: effect_mapping_effects
CREATE TABLE effect_mapping_effects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    effect_mapping_id UUID NOT NULL REFERENCES effect_mappings(id) ON DELETE CASCADE,
    output_variable VARCHAR(50) NOT NULL CHECK (output_variable IN (
        'acidity', 'sweetness', 'bitterness', 'body',
        'aroma', 'aftertaste', 'overall'
    )),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('increase', 'decrease', 'none')),
    range_min DECIMAL(5,2),
    range_max DECIMAL(5,2),
    confidence VARCHAR(10) NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_range CHECK (range_min IS NULL OR range_max IS NULL OR range_min <= range_max)
);

-- Indexes for parent table
CREATE INDEX idx_effect_mappings_user_id ON effect_mappings(user_id);
CREATE INDEX idx_effect_mappings_variable ON effect_mappings(user_id, variable);
CREATE INDEX idx_effect_mappings_active ON effect_mappings(user_id) WHERE active = true;

-- Index for child table
CREATE INDEX idx_effect_mapping_effects_mapping_id ON effect_mapping_effects(effect_mapping_id);
