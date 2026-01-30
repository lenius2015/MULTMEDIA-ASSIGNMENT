-- Enhanced Chat System Database Schema
-- Smart chatbot with live admin support, WhatsApp integration, and comprehensive features

-- Conversations table - enhanced with mode tracking
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(255) NULL,
    status ENUM('open', 'closed', 'waiting_admin', 'offline_message') DEFAULT 'open',
    chat_mode ENUM('chatbot', 'live_chat', 'whatsapp_redirect') DEFAULT 'chatbot',
    admin_id INT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    auto_close_minutes INT DEFAULT 30,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status),
    INDEX idx_chat_mode (chat_mode),
    INDEX idx_admin_id (admin_id),
    INDEX idx_last_message_at (last_message_at),
    INDEX idx_last_activity_at (last_activity_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table - enhanced with typing and seen indicators
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_type ENUM('user', 'admin', 'bot') NOT NULL,
    sender_id INT NULL,
    sender_name VARCHAR(255) NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system', 'quick_reply') DEFAULT 'text',
    status ENUM('sent', 'delivered', 'seen', 'failed') DEFAULT 'sent',
    is_faq_response BOOLEAN DEFAULT FALSE,
    faq_question_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    seen_at TIMESTAMP NULL,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_type (sender_type),
    INDEX idx_sender_id (sender_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_conversation_created (conversation_id, created_at),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Typing indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_type ENUM('user', 'admin', 'bot') NOT NULL,
    user_id INT NULL,
    is_typing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 SECOND),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FAQ Questions and Answers - enhanced with language support
CREATE TABLE IF NOT EXISTS faq_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT NOT NULL COMMENT 'Comma-separated keywords for matching',
    category VARCHAR(100) DEFAULT 'general',
    priority INT DEFAULT 0 COMMENT 'Higher priority questions shown first',
    usage_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    language ENUM('en', 'sw', 'both') DEFAULT 'both',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_is_active (is_active),
    INDEX idx_language (language),
    FULLTEXT KEY idx_keywords (keywords, question)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin online status tracking - enhanced
CREATE TABLE IF NOT EXISTS admin_online_status (
    admin_id INT PRIMARY KEY,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    socket_id VARCHAR(255) NULL,
    accept_chats BOOLEAN DEFAULT TRUE,
    current_conversations INT DEFAULT 0,
    max_concurrent_chats INT DEFAULT 5,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat settings - enhanced with new features
CREATE TABLE IF NOT EXISTS chat_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Offline messages table - new
CREATE TABLE IF NOT EXISTS offline_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_email VARCHAR(255) NULL,
    visitor_phone VARCHAR(50) NULL,
    message TEXT NOT NULL,
    source_page VARCHAR(500) NULL,
    status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
    assigned_admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    replied_at TIMESTAMP NULL,
    FOREIGN KEY (assigned_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_assigned_admin (assigned_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat sessions tracking - new
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INT NULL,
    user_ip VARCHAR(50) NULL,
    user_agent TEXT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    total_messages INT DEFAULT 0,
    chat_mode ENUM('chatbot', 'live_chat') DEFAULT 'chatbot',
    satisfaction_rating INT NULL COMMENT '1-5 star rating',
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_start_time (start_time),
    INDEX idx_chat_mode (chat_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp integration settings - new
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    default_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    business_hours_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default enhanced settings
INSERT INTO chat_settings (setting_key, setting_value, setting_type, description) VALUES
('auto_close_minutes', '30', 'number', 'Minutes of inactivity before auto-closing chat'),
('whatsapp_number', '+255700000000', 'string', 'WhatsApp support number'),
('whatsapp_message', 'Hello! I need help with my order from OMUNJU SHOPPERS.', 'string', 'Default WhatsApp message'),
('sound_enabled', 'true', 'boolean', 'Enable sound notifications'),
('chatbot_greeting', 'Hello! 👋 I am OMUNJU SHOPPERS assistant. How can I help you today?', 'string', 'Initial chatbot greeting'),
('offline_message', 'Our customer support team is currently offline. Please leave a message and we will get back to you within 24 hours.', 'string', 'Message shown when admin is offline'),
('live_chat_switch_phrase', 'talk to admin,live chat,human,customer care,real person,agent', 'string', 'Phrases that trigger live chat switch'),
('typing_indicator_timeout', '10000', 'number', 'Timeout for typing indicator (milliseconds)'),
('max_concurrent_chats', '5', 'number', 'Maximum concurrent chats per admin'),
('language_mode', 'auto', 'string', 'Language detection mode: auto, en, sw'),
('quick_replies_enabled', 'true', 'boolean', 'Enable quick reply buttons'),
('satisfaction_survey', 'true', 'boolean', 'Show satisfaction survey at end of chat')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Insert default FAQ questions - enhanced with bilingual support
INSERT INTO faq_questions (question, answer, keywords, category, priority, language) VALUES
('What are your delivery charges?', 'Delivery is FREE for orders over TSH 50,000. For orders below TSH 50,000, delivery charges vary by location:\n\n📦 Dar es Salaam: TSH 5,000\n🏙️ Other cities: TSH 8,000-12,000\n🌍 Remote areas: TSH 15,000', 'delivery,shipping,charges,cost,free,price,dar es salaam,tanzania', 'shipping', 10, 'both'),
('How long does delivery take?', 'Delivery times:\n\n⏰ Dar es Salaam: 1-2 business days\n🏙️ Other cities in Tanzania: 3-5 business days\n🌍 Remote areas: 5-7 business days\n\nYou will receive SMS updates with tracking information!', 'delivery,time,how long,days,shipping,tracking', 'shipping', 9, 'both'),
('What payment methods do you accept?', 'We accept multiple payment methods:\n\n💳 Credit/Debit Cards (Visa, Mastercard)\n📱 M-Pesa\n🏦 Bank Transfer\n💵 Cash on Delivery\n\nM-Pesa is the fastest and most convenient option!', 'payment,mpesa,card,paypal,cash,methods,visa,mastercard', 'payment', 10, 'both'),
('How do I track my order?', 'Track your order easily:\n\n1. Log into your account\n2. Go to Dashboard > Orders\n3. Click on your order number\n4. View tracking status\n\nYou will also receive SMS updates!', 'track,order,tracking,status,where,dashboard', 'orders', 8, 'both'),
('What is your return policy?', 'Our return policy:\n\n✅ 7-day return window\n✅ Items must be unopened with original packaging\n✅ Contact us within 7 days to initiate return\n✅ Refunds processed within 5 business days', 'return,refund,policy,exchange,money back,days', 'returns', 9, 'both'),
('How do I cancel my order?', 'To cancel your order:\n\n1. Go to Dashboard > Orders\n2. Find your order\n3. Click "Cancel Order" button\n\n⚠️ Note: Can only cancel if order has not been shipped yet.', 'cancel,order,cancellation,how', 'orders', 7, 'both'),
('Do you offer warranties?', 'Yes! Warranty coverage:\n\n🔧 Electronics: Manufacturer warranty (1-2 years)\n👕 Clothing: 30-day quality guarantee\n🏠 Home items: 30-day quality guarantee\n\nCheck product pages for specific warranty details.', 'warranty,guarantee,protection,electronics,clothing', 'products', 6, 'both'),
('How do auctions work?', 'Auction guide:\n\n1. Find auctions in Auctions section\n2. Place your bid\n3. Highest bidder when timer ends wins!\n4. Complete payment within 24 hours\n5. Item shipped to you', 'auction,bid,bidding,how,work,timer,highest', 'auctions', 8, 'both'),
('What are your business hours?', 'Business hours:\n\n🖥️ Online Store: 24/7\n📞 Customer Support: Mon-Sat, 8AM-8PM EAT\n💬 WhatsApp Support: 24/7\n\nWe are here to help anytime!', 'hours,time,open,available,support,whatsapp', 'general', 5, 'both'),
('How do I contact customer support?', 'Contact us:\n\n💬 Click "I Need Help" for live chat\n📱 WhatsApp: Click the WhatsApp button\n📧 Email: support@omunjushoppers.com\n📞 Phone: +255 700 000 000', 'contact,support,help,customer service,whatsapp,email,phone', 'general', 10, 'both'),
('Je huduma za ugavi zinasimama vipi?', 'Ugavi ni bure kwa maagizo za TSH 50,000+. Kwa maagizo chini ya TSH 50,000:\n\n📦 Dar es Salaam: TSH 5,000\n🏙️ Miji mingine: TSH 8,000-12,000', 'ugavi,ugawa,delivery,huduma za utoaji', 'shipping', 10, 'sw'),
('Je msaada wa malipo unapatikana vipi?', 'Tunakubali:\n\n💳 Kikadi cha Mkopo/Debiti\n📱 M-Pesa\n🏦 Uhamisho wa Benki\n💵 Malipo kwa Kuwasilisha\n\nM-Pesa ni chaguo la haraka zaidi!', 'malipo,mpesa,kikadi,benki', 'payment', 10, 'sw')
ON DUPLICATE KEY UPDATE answer = VALUES(answer);

-- Insert default WhatsApp settings
INSERT INTO whatsapp_settings (phone_number, default_message, is_active) VALUES
('+255700000000', 'Hello! I need help with my order from OMUNJU SHOPPERS.', true)
ON DUPLICATE KEY UPDATE phone_number = VALUES(phone_number);

-- Create stored procedure for auto-close inactive conversations
DELIMITER //
CREATE PROCEDURE close_inactive_conversations()
BEGIN
    UPDATE conversations 
    SET status = 'closed', 
        closed_at = CURRENT_TIMESTAMP 
    WHERE status = 'open' 
    AND last_activity_at < DATE_SUB(NOW(), INTERVAL auto_close_minutes MINUTE);
END //
DELIMITER ;

-- Create stored procedure for cleanup expired typing indicators
DELIMITER //
CREATE PROCEDURE cleanup_typing_indicators()
BEGIN
    DELETE FROM typing_indicators WHERE expires_at < CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Create index for faster message retrieval by conversation
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Create view for active conversations
CREATE OR REPLACE VIEW active_conversations_view AS
SELECT 
    c.*,
    u.name as user_name,
    u.email as user_email,
    a.name as admin_name,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_time
FROM conversations c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN admins a ON c.admin_id = a.id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.status = 'open'
GROUP BY c.id
ORDER BY c.last_message_at DESC;

-- Create view for admin workload
CREATE OR REPLACE VIEW admin_workload_view AS
SELECT 
    a.id,
    a.name,
    a.email,
    COALESCE(aos.is_online, FALSE) as is_online,
    COALESCE(aos.accept_chats, TRUE) as accept_chats,
    COUNT(DISTINCT c.id) as active_conversations,
    COALESCE(aos.max_concurrent_chats, 5) as max_conversations,
    (COALESCE(aos.max_concurrent_chats, 5) - COUNT(DISTINCT c.id)) as available_slots
FROM admins a
LEFT JOIN admin_online_status aos ON a.id = aos.admin_id
LEFT JOIN conversations c ON a.id = c.admin_id AND c.status = 'open'
WHERE a.is_active = TRUE
GROUP BY a.id;