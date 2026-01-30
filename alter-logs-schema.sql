-- Alter existing log tables to include user time zone and enhanced device information

-- Security Logs Table
ALTER TABLE security_logs
ADD COLUMN time_zone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN user_timezone_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN browser VARCHAR(100),
ADD COLUMN browser_version VARCHAR(50),
ADD COLUMN device_type VARCHAR(50),
ADD COLUMN os VARCHAR(100),
ADD COLUMN os_version VARCHAR(50);

-- Activity Logs Table
ALTER TABLE activity_logs
ADD COLUMN time_zone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN user_timezone_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN browser VARCHAR(100),
ADD COLUMN browser_version VARCHAR(50),
ADD COLUMN device_type VARCHAR(50),
ADD COLUMN os VARCHAR(100),
ADD COLUMN os_version VARCHAR(50);

-- Error Logs Table
ALTER TABLE error_logs
ADD COLUMN time_zone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN user_timezone_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN browser VARCHAR(100),
ADD COLUMN browser_version VARCHAR(50),
ADD COLUMN device_type VARCHAR(50),
ADD COLUMN os VARCHAR(100),
ADD COLUMN os_version VARCHAR(50);

-- Access Logs Table
ALTER TABLE access_logs
ADD COLUMN time_zone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN user_timezone_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN browser VARCHAR(100),
ADD COLUMN browser_version VARCHAR(50),
ADD COLUMN device_type VARCHAR(50),
ADD COLUMN os VARCHAR(100),
ADD COLUMN os_version VARCHAR(50);

-- Login Attempts Table
ALTER TABLE login_attempts
ADD COLUMN time_zone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN user_timezone_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN browser VARCHAR(100),
ADD COLUMN browser_version VARCHAR(50),
ADD COLUMN device_type VARCHAR(50),
ADD COLUMN os VARCHAR(100),
ADD COLUMN os_version VARCHAR(50);

-- User Sessions Table
ALTER TABLE user_sessions
ADD COLUMN time_zone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN user_timezone_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN browser VARCHAR(100),
ADD COLUMN browser_version VARCHAR(50),
ADD COLUMN device_type VARCHAR(50),
ADD COLUMN os VARCHAR(100),
ADD COLUMN os_version VARCHAR(50);