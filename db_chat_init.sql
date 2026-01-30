-- Chat System Database Schema
-- Comprehensive chat system with FAQ bot, live admin support, and status tracking

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(255) NULL,
    status ENUM('open', 'closed', 'waiting_admin') DEFAULT 'open',
    type ENUM('faq_bot', 'admin_support') DEFAULT 'faq_bot',
    admin_id INT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    auto_close_minutes INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_admin_id (admin_id),
    INDEX idx_last_message_at (last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_type ENUM('user', 'admin', 'bot') NOT NULL,
    sender_id INT NULL,
    message TEXT NOT NULL,
    status ENUM('sent', 'delivered', 'seen', 'offline') DEFAULT 'sent',
    is_faq_response BOOLEAN DEFAULT FALSE,
    faq_question_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    seen_at TIMESTAMP NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_type (sender_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FAQ Questions and Answers
CREATE TABLE IF NOT EXISTS faq_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT NOT NULL COMMENT 'Comma-separated keywords for matching',
    category VARCHAR(100) DEFAULT 'general',
    priority INT DEFAULT 0 COMMENT 'Higher priority questions shown first',
    usage_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_is_active (is_active),
    FULLTEXT KEY idx_keywords (keywords, question)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin online status tracking
CREATE TABLE IF NOT EXISTS admin_online_status (
    admin_id INT PRIMARY KEY,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    socket_id VARCHAR(255) NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat settings
CREATE TABLE IF NOT EXISTS chat_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO chat_settings (setting_key, setting_value, description) VALUES
('auto_close_minutes', '30', 'Minutes of inactivity before auto-closing chat'),
('whatsapp_number', '+254700000000', 'WhatsApp support number'),
('whatsapp_message', 'Hello! I need help with my order.', 'Default WhatsApp message'),
('sound_enabled', 'true', 'Enable sound notifications'),
('offline_message', 'Admin yuko offline, tumehifadhi ujumbe wako.', 'Message shown when admin is offline')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Insert default FAQ questions
INSERT INTO faq_questions (question, answer, keywords, category, priority) VALUES
('What are your delivery charges?', 'Delivery is FREE for orders over TSH 5,000. For orders below TSH 5,000, delivery charges vary by location: Dar es salaam (TSH 200), Other cities (TSH 300-500).', 'delivery,shipping,charges,cost,free,price', 'shipping', 10),
('How long does delivery take?', 'Delivery takes 1-3 business days within DAR ES SALAAM and 3-7 business days for other regions in TANZANIA.', 'delivery,time,how long,days,shipping', 'shipping', 9),
('What payment methods do you accept?', 'We accept M-Pesa, Credit/Debit Cards, PayPal, and Cash on Delivery. M-Pesa is the fastest and most convenient option!', 'payment,mpesa,card,paypal,cash,methods', 'payment', 10),
('How do I track my order?', 'You can track your order from your Dashboard > Orders section. You will also receive SMS updates with tracking information.', 'track,order,tracking,status,where', 'orders', 8),
('What is your return policy?', 'We offer 7-day returns for unopened items in original packaging. Contact us within 7 days of delivery to initiate a return.', 'return,refund,policy,exchange,money back', 'returns', 9),
('How do I cancel my order?', 'You can cancel your order from Dashboard > Orders if it has not been shipped yet. Once shipped, you will need to return it after delivery.', 'cancel,order,cancellation', 'orders', 7),
('Do you offer warranties?', 'Yes! All electronics come with manufacturer warranty. Other products have our 30-day quality guarantee.', 'warranty,guarantee,protection', 'products', 6),
('How do auctions work?', 'Auctions allow you to bid on products. The highest bidder when the timer ends wins! You can place bids and track auctions in the Auctions section.', 'auction,bid,bidding,how,work', 'auctions', 8),
('What are your business hours?', 'Our online store is open 24/7! Customer support is available Monday-Saturday, 8AM-8PM EAT. WhatsApp support is available 24/7.', 'hours,time,open,available,support', 'general', 5),
('How do I contact customer support?', 'Click "I Need Help" button below to chat with our support team, or reach us on WhatsApp at the number provided.', 'contact,support,help,customer service', 'general', 10)
ON DUPLICATE KEY UPDATE answer = VALUES(answer);
