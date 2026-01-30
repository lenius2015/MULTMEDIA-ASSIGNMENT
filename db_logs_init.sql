-- Logs and Security Tables for OMUNJU SHOPPERS E-commerce Website

-- Security Logs Table
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    message TEXT NOT NULL,
    ip VARCHAR(45),
    user_id INT,
    user_agent TEXT,
    url VARCHAR(500),
    method VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_created_at (created_at),
    INDEX idx_ip (ip),
    INDEX idx_user_id (user_id)
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    message TEXT,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('error', 'warning', 'notice') DEFAULT 'error',
    message TEXT NOT NULL,
    file VARCHAR(500),
    line INT,
    stack_trace TEXT,
    url VARCHAR(500),
    method VARCHAR(10),
    ip VARCHAR(45),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_created_at (created_at),
    INDEX idx_file (file)
);

-- Access Logs Table
CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    method VARCHAR(10) NOT NULL,
    url VARCHAR(500) NOT NULL,
    status_code INT NOT NULL,
    response_time INT, -- in milliseconds
    user_agent TEXT,
    referer VARCHAR(500),
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip),
    INDEX idx_timestamp (timestamp),
    INDEX idx_status_code (status_code),
    INDEX idx_user_id (user_id)
);

-- Login Attempts Table
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_ip (ip),
    INDEX idx_attempted_at (attempted_at),
    INDEX idx_success (success)
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_last_activity (last_activity)
);

-- Blocked IPs Table
CREATE TABLE IF NOT EXISTS blocked_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT,
    blocked_by INT, -- admin user id
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP NULL,
    INDEX idx_ip (ip),
    INDEX idx_blocked_until (blocked_until)
);

-- Insert some sample data for testing
INSERT INTO security_logs (level, message, ip, user_agent) VALUES
('info', 'Admin login successful', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('warning', 'Multiple failed login attempts detected', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('error', 'Unauthorized access attempt to admin panel', '10.0.0.5', 'curl/7.68.0');

INSERT INTO activity_logs (user_id, action, message, ip) VALUES
(1, 'login', 'User logged in successfully', '127.0.0.1'),
(1, 'profile_update', 'User updated profile information', '127.0.0.1'),
(2, 'order_placed', 'User placed a new order', '192.168.1.50');

INSERT INTO error_logs (level, message, file, line, ip) VALUES
('error', 'Database connection failed', '/app/db.js', 25, '127.0.0.1'),
('warning', 'Invalid input validation', '/routes/auth.js', 45, '192.168.1.100');

INSERT INTO access_logs (ip, method, url, status_code, response_time, user_agent) VALUES
('127.0.0.1', 'GET', '/', 200, 150, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('192.168.1.100', 'POST', '/login', 200, 300, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('10.0.0.5', 'GET', '/admin', 403, 50, 'curl/7.68.0');

INSERT INTO login_attempts (email, ip, success) VALUES
('admin@example.com', '127.0.0.1', 1),
('user@example.com', '192.168.1.100', 0),
('user@example.com', '192.168.1.100', 0),
('user@example.com', '192.168.1.100', 0);

INSERT INTO user_sessions (user_id, session_id, ip) VALUES
(1, 'sess_123456789', '127.0.0.1'),
(2, 'sess_987654321', '192.168.1.50');