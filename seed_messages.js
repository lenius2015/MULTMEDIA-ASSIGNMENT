/**
 * Seed script for creating sample conversation data
 * Run this script to populate the database with test conversations
 * 
 * Usage: node seed_messages.js
 */

const db = require('./db');

async function seedConversations() {
    try {
        console.log('🌱 Starting conversation seed...');
        
        // Check if users exist
        const [users] = await db.query('SELECT id, name FROM users LIMIT 5');
        if (users.length === 0) {
            console.log('No users found. Creating sample users...');
            // Create sample users
            await db.query(`
                INSERT INTO users (name, email, password, phone, created_at) VALUES
                ('John Doe', 'john@example.com', 'hashed_password', '+254700000001', NOW()),
                ('Jane Smith', 'jane@example.com', 'hashed_password', '+254700000002', NOW()),
                ('Bob Wilson', 'bob@example.com', 'hashed_password', '+254700000003', NOW()),
                ('Alice Brown', 'alice@example.com', 'hashed_password', '+254700000004', NOW()),
                ('Charlie Davis', 'charlie@example.com', 'hashed_password', '+254700000005', NOW())
            `);
            console.log('✅ Sample users created');
        }
        
        // Get users again
        const [userList] = await db.query('SELECT id, name FROM users LIMIT 5');
        
        // Check if conversations exist
        const [existingConvos] = await db.query('SELECT COUNT(*) as count FROM conversations');
        if (existingConvos[0].count > 0) {
            console.log(`ℹ️  ${existingConvos[0].count} conversations already exist. Skipping seed.`);
            console.log('✅ Seed completed (existing data preserved)');
            return;
        }
        
        // Create sample conversations
        console.log('📝 Creating sample conversations...');
        
        const statuses = ['open', 'active', 'waiting_admin'];
        const priorities = ['normal', 'high', 'urgent'];
        
        for (let i = 0; i < userList.length; i++) {
            const user = userList[i];
            const status = statuses[i % statuses.length];
            const priority = priorities[i % priorities.length];
            
            // Insert conversation
            const [convResult] = await db.query(`
                INSERT INTO conversations (user_id, session_id, status, chat_mode, admin_id, priority, last_message_at, created_at)
                VALUES (?, ?, ?, 'live_chat', 1, ?, NOW() - INTERVAL ? HOUR, NOW() - INTERVAL ? HOUR)
            `, [user.id, `session_${i}_${Date.now()}`, status, priority, i + 1, i + 1]);
            
            const conversationId = convResult.insertId;
            
            // Add messages
            const messages = [
                { text: `Hi, I have a question about my order #${1000 + i}`, sender_type: 'user', sender_id: user.id, sender_name: user.name, hours_ago: i + 1 },
                { text: `Hello ${user.name}! I'd be happy to help with your order. Could you please provide your order number?`, sender_type: 'admin', sender_id: 1, sender_name: 'Support Agent', hours_ago: i },
            ];
            
            if (status === 'open' || status === 'active') {
                messages.push({ text: `My order number is #${1000 + i} placed yesterday`, sender_type: 'user', sender_id: user.id, sender_name: user.name, hours_ago: 0 });
            }
            
            for (const msg of messages) {
                await db.query(`
                    INSERT INTO messages (conversation_id, sender_type, sender_id, sender_name, message, message_type, status, is_read, created_at)
                    VALUES (?, ?, ?, ?, ?, 'text', 'sent', ?, NOW() - INTERVAL ? HOUR)
                `, [conversationId, msg.sender_type, msg.sender_id, msg.sender_name, msg.text, msg.sender_type === 'user' ? false : true, msg.hours_ago]);
            }
            
            console.log(`✅ Created conversation ${i + 1} for ${user.name}`);
        }
        
        console.log('✅ Seed completed successfully!');
        console.log('📊 You can now test the admin messages panel');
        
    } catch (error) {
        console.error('❌ Error seeding conversations:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

seedConversations();
