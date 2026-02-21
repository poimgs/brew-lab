ALTER TABLE users ADD COLUMN share_token VARCHAR(64);
ALTER TABLE users ADD COLUMN share_token_created_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX idx_users_share_token ON users(share_token) WHERE share_token IS NOT NULL;
