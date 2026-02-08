const pool = require('./db');

async function checkConversationLinks() {
  try {
    console.log('Checking conversation links...\n');
    
    // Get all conversation IDs from messages table
    const [messageConversations] = await pool.query('SELECT DISTINCT conversation_id FROM messages ORDER BY conversation_id');
    console.log('Conversation IDs in messages table:', messageConversations.map(c => c.conversation_id));
    
    // Get all conversation IDs from conversations table
    const [convConversations] = await pool.query('SELECT id FROM conversations ORDER BY id');
    console.log('Conversation IDs in conversations table:', convConversations.map(c => c.id));
    
    // Check for messages without conversations
    const [orphanedMessages] = await pool.query(`
      SELECT m.id, m.conversation_id, m.content, m.sender_type
      FROM messages m
      LEFT JOIN conversations c ON m.conversation_id = c.id
      WHERE c.id IS NULL
    `);
    console.log('Messages without conversations:', orphanedMessages.length);
    if (orphanedMessages.length > 0) {
      console.log('Sample orphaned messages:');
      orphanedMessages.slice(0, 3).forEach(msg => {
        console.log(`  ID:${msg.id}, ConvID:${msg.conversation_id}, Type:${msg.sender_type}`);
      });
    }
    
    // Check for conversations without messages
    const [emptyConversations] = await pool.query(`
      SELECT c.id, c.user_id, c.status
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE m.id IS NULL
    `);
    console.log('Conversations without messages:', emptyConversations.length);
    if (emptyConversations.length > 0) {
      console.log('Sample empty conversations:');
      emptyConversations.slice(0, 3).forEach(conv => {
        console.log(`  ID:${conv.id}, User:${conv.user_id}, Status:${conv.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking conversation links:', error);
  }
}

checkConversationLinks();