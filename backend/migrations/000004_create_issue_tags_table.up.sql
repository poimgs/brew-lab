CREATE TABLE issue_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System tags have NULL user_id, user tags have user_id set
-- Unique constraint: system tags are unique by name, user tags are unique per user
CREATE UNIQUE INDEX idx_issue_tags_system_name ON issue_tags(name) WHERE user_id IS NULL;
CREATE UNIQUE INDEX idx_issue_tags_user_name ON issue_tags(user_id, name) WHERE user_id IS NOT NULL;
CREATE INDEX idx_issue_tags_user_id ON issue_tags(user_id);

-- Insert predefined system tags for common brewing issues
INSERT INTO issue_tags (name, is_system) VALUES
    ('Channeling', TRUE),
    ('Under-extracted', TRUE),
    ('Over-extracted', TRUE),
    ('Bitter', TRUE),
    ('Sour', TRUE),
    ('Weak', TRUE),
    ('Astringent', TRUE),
    ('Stale', TRUE),
    ('Muddy', TRUE),
    ('Harsh', TRUE);
