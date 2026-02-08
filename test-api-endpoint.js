const pool = require('./db');

async function testAPIEndpoint() {
  try {
    console.log('Testing API endpoint for conversation 1...\n');
    
    // Simulate the API call from the frontend
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
    
    console.log('API Response would contain:');
    console.log('Conversations:', conversations.length);
    console.log('First conversation:', {
      id: conversations[0].id,
      user_name: conversations[0].user_name,
      last_message: conversations[0].last_message,
      unread_count: conversations[0].unread_count
    });
    
    // Test messages for conversation 1
    const [messages] = await pool.query(`
      SELECT m.*,
             u.name as user_name,
             u.profile_picture as user_avatar,
             a.name as admin_name,
             a.profile_picture as admin_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id AND m.sender_type = 'user'
      LEFT JOIN admins a ON m.sender_id = a.id AND m.sender_type = 'admin'
      WHERE m.conversation_id = 1
      ORDER BY m.created_at ASC
    `);
    
    console.log('Messages for conversation 1:', messages.length);
    messages.forEach((msg, i) => {
      console.log(`  ${i+1}. Type:${msg.sender_type}, Content:${msg.content?.substring(0, 30)}...`);
    });
    
  } catch (error) {
    console.error('Error testing API endpoint:', error);
  }
}

testAPIEndpoint();