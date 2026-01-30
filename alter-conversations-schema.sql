-- Conversations and Messages Schema for User-Admin Chat System

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    admin_id INT NULL, -- NULL if not assigned to specific admin
    subject VARCHAR(255),
    status ENUM('active', 'closed', 'pending') DEFAULT 'active',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_last_message_at (last_message_at)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_type ENUM('user', 'admin') NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
    content TEXT NOT NULL,
    file_url VARCHAR(500) NULL,
    file_name VARCHAR(255) NULL,
    file_size INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_sender_type (sender_type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Conversation Participants (for group chats if needed in future)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('user', 'admin') NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Insert sample data for testing
INSERT INTO conversations (user_id, subject, status, priority) VALUES
(1, 'Order Issue', 'active', 'high'),
(2, 'Product Question', 'active', 'medium'),
(3, 'Technical Support', 'closed', 'low');

INSERT INTO messages (conversation_id, sender_id, sender_type, content, is_read) VALUES
(1, 1, 'user', 'Hi, I have an issue with my order #12345', true),
(1, 1, 'admin', 'Hello! I\'d be happy to help you with your order. Can you please provide more details?', true),
(1, 1, 'user', 'The delivery is delayed. Can you check the status?', false),
(2, 2, 'user', 'Is this product available in blue color?', true),
(2, 1, 'admin', 'Yes, the blue variant is available. Would you like me to check stock for you?', false);