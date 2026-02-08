const pool = require('./db');

async function checkTimestamps() {
  try {
    console.log('Checking conversation timestamps...\n');
    
    const [conversations] = await pool.query('SELECT id, status, user_id, last_message_at FROM conversations ORDER BY last_message_at DESC');
    console.log('All conversations by timestamp:');
    conversations.forEach(conv => {
      console.log(`  ID:${conv.id}, Status:${conv.status}, User:${conv.user_id}, Last Msg:${conv.last_message_at}`);
    });
    
  } catch (error) {
    console.error('Error checking timestamps:', error);
  }
}

checkTimestamps();