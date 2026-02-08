const pool = require('./db');

async function checkConversationStatus() {
  try {
    console.log('Checking conversation status for IDs 1 and 2...\n');
    
    const [conversations] = await pool.query('SELECT id, status, user_id, last_message_at FROM conversations WHERE id IN (1, 2)');
    console.log('Conversations 1 and 2:');
    conversations.forEach(conv => {
      console.log(`  ID:${conv.id}, Status:${conv.status}, User:${conv.user_id}, Last Message:${conv.last_message_at}`);
    });
    
    // Check messages for these conversations
    const [messages] = await pool.query('SELECT id, conversation_id, sender_type, content, created_at FROM messages WHERE conversation_id IN (1, 2) ORDER BY created_at');
    console.log('\nMessages for conversations 1 and 2:');
    messages.forEach(msg => {
      console.log(`  ID:${msg.id}, Conv:${msg.conversation_id}, Type:${msg.sender_type}, Content:${msg.content?.substring(0, 30)}...`);
    });
    
  } catch (error) {
    console.error('Error checking conversation status:', error);
  }
}

checkConversationStatus();