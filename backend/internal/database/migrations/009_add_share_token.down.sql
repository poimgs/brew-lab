DROP INDEX IF EXISTS idx_users_share_token;
ALTER TABLE users DROP COLUMN share_token_created_at;
ALTER TABLE users DROP COLUMN share_token;
