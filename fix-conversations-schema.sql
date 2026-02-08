-- Add the missing last_activity_at column
ALTER TABLE conversations ADD last_activity_at TIMESTAMP NULL DEFAULT NULL;

-- Update existing records to have last_activity_at set to last_message_at
UPDATE conversations SET last_activity_at = last_message_at WHERE last_activity_at IS NULL;

-- Make sure the column is indexed for performance
ALTER TABLE conversations ADD INDEX idx_last_activity_at (last_activity_at);
