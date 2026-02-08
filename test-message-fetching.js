const pool = require('./db');

async function testMessageFetching() {
  try {
    console.log('Testing message fetching...\n');
    
    // Test 1: Get conversations
    console.log('1. Testing conversations query:');
    const [conversations] = await pool.query(`
      SELECT c.*,
             u.name as user_name,
             u.email as user_email,
             u.profile_picture as user_avatar,
             a.name as admin_name,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND status = 'sent' AND sender_type = 'user') as unread_count,
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN admins a ON c.admin_id = a.id
      WHERE c.status != 'deleted'
      ORDER BY c.last_message_at DESC
    `);
    console.log('Conversations found:', conversations.length);
    if (conversations.length > 0) {
      console.log('Sample conversation:', {
        id: conversations[0].id,
        user_name: conversations[0].user_name,
        last_message: conversations[0].last_message,
        unread_count: conversations[0].unread_count
      });
    }
    
    // Test 2: Get messages for a conversation
    if (conversations.length > 0) {
      console.log('\n2. Testing messages query for conversation', conversations[0].id);
      const [messages] = await pool.query(`
        SELECT m.*,
               u.name as user_name,
               u.profile_picture as user_avatar,
               a.name as admin_name,
               a.profile_picture as admin_avatar
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id AND m.sender_type = 'user'
        LEFT JOIN admins a ON m.sender_id = a.id AND m.sender_type = 'admin'
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `, [conversations[0].id]);
      console.log('Messages found:', messages.length);
      if (messages.length > 0) {
        console.log('Sample message:', {
          id: messages[0].id,
          sender_type: messages[0].sender_type,
          content: messages[0].content,
          created_at: messages[0].created_at
        });
      }
    }
    
    // Test 3: Check if messages table has data
    console.log('\n3. Testing messages table directly:');
    const [messageCount] = await pool.query('SELECT COUNT(*) as count FROM messages');
    console.log('Total messages:', messageCount[0].count);
    
    if (messageCount[0].count > 0) {
      const [sampleMessages] = await pool.query('SELECT * FROM messages LIMIT 3');
      console.log('Sample messages:');
      sampleMessages.forEach((msg, i) => {
        console.log(`  ${i+1}. ID:${msg.id}, Type:${msg.sender_type}, Content:${msg.content?.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error testing message fetching:', error);
  }
}

testMessageFetching();