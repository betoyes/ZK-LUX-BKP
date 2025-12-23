-- Migration: Harden verify-email and reset-password tokens
-- This migration replaces plaintext token columns with SHA256 hashed token_hash columns
-- 
-- IMPORTANT: After running this migration, any existing tokens will be invalidated
-- because we cannot reverse the hash. Users will need to request new tokens.

-- Step 1: Add new token_hash columns to both tables
ALTER TABLE email_verification_tokens
ADD COLUMN IF NOT EXISTS token_hash TEXT;

ALTER TABLE password_reset_tokens
ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Step 2: For any existing tokens, we cannot recover the original token to hash it
-- So we'll delete all existing tokens (users will need to request new ones)
-- This is the only secure option since we can't hash unknown plaintext values
DELETE FROM email_verification_tokens WHERE token_hash IS NULL;
DELETE FROM password_reset_tokens WHERE token_hash IS NULL;

-- Step 3: Make token_hash NOT NULL and UNIQUE
ALTER TABLE email_verification_tokens
ALTER COLUMN token_hash SET NOT NULL;

ALTER TABLE email_verification_tokens
ADD CONSTRAINT email_verification_tokens_token_hash_unique UNIQUE (token_hash);

ALTER TABLE password_reset_tokens
ALTER COLUMN token_hash SET NOT NULL;

ALTER TABLE password_reset_tokens
ADD CONSTRAINT password_reset_tokens_token_hash_unique UNIQUE (token_hash);

-- Step 4: Drop the old token columns
ALTER TABLE email_verification_tokens
DROP COLUMN IF EXISTS token;

ALTER TABLE password_reset_tokens
DROP COLUMN IF EXISTS token;

-- Step 5: Create indexes on token_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash 
ON email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash 
ON password_reset_tokens(token_hash);
