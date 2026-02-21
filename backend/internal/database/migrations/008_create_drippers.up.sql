CREATE TABLE drippers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_drippers_user_id ON drippers(user_id);
CREATE UNIQUE INDEX idx_drippers_user_name ON drippers(user_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_drippers_deleted_at ON drippers(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE brews ADD COLUMN dripper_id UUID REFERENCES drippers(id);
