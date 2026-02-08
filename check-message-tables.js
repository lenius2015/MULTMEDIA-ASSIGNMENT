const pool = require('./db');

async function checkMessageTables() {
  const tables = ['messages', 'chat_messages', 'inbox_messages', 'contact_messages'];
  
  console.log('Checking message tables...\n');
  
  for (const table of tables) {
    try {
      const [result] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${result[0].count} messages`);
      
      if (result[0].count > 0) {
        const [sample] = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
        console.log(`Sample from ${table}:`, Object.keys(sample[0]));
        console.log('Sample data:', sample[0]);
      }
      console.log('---');
    } catch (error) {
      console.log(`${table}: Table doesn't exist or error - ${error.message}`);
      console.log('---');
    }
  }
}

checkMessageTables().catch(console.error);