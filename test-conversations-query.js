const pool = require('./db');

async function testConversationsQuery() {
  try {
    console.log('Testing conversations query directly...\n');
    
    // Test the exact query from the route
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
    conversations.forEach((conv, i) => {
      console.log(`  ${i+1}. ID:${conv.id}, Status:${conv.status}, User:${conv.user_name || 'Unknown'}, Last Msg:${conv.last_message?.substring(0, 30)}...`);
    });
    
  } catch (error) {
    console.error('Error testing conversations query:', error);
  }
}

testConversationsQuery();