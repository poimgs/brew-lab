CREATE TABLE filter_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_filter_papers_user_id ON filter_papers(user_id);
CREATE UNIQUE INDEX idx_filter_papers_user_name ON filter_papers(user_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_filter_papers_deleted_at ON filter_papers(deleted_at) WHERE deleted_at IS NULL;
