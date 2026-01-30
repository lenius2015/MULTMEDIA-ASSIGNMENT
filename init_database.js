srequire('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  let connection;

  try {
    // Create connection without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    console.log('Connected to MySQL server');

    // Create database if not exists
    await connection.execute('CREATE DATABASE IF NOT EXISTS ecommerce');
    console.log('Database "ecommerce" created or already exists');

    // Switch to ecommerce database
    await connection.execute('USE ecommerce');

    // List of SQL files to execute in order
    const sqlFiles = [
      'db_init.sql',
      'alter-admin-system-schema.sql',
      'db_enhanced_chat_init.sql',
      'db_notifications_init.sql',
      'db_logs_init.sql',
      'db_auction_init.sql',
      'alter-conversations-schema.sql',
      'alter-logs-schema.sql',
      'alter-messages-status-column.sql',
      'seed_notifications.sql'
    ];

    // Execute each SQL file
    for (const sqlFile of sqlFiles) {
      const filePath = path.join(__dirname, sqlFile);
      if (fs.existsSync(filePath)) {
        console.log(`Executing ${sqlFile}...`);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await connection.execute(statement);
            } catch (error) {
              // Ignore duplicate key errors and some other non-critical errors
              if (!error.message.includes('Duplicate entry') &&
                  !error.message.includes('already exists') &&
                  !error.message.includes('Duplicate key name')) {
                console.warn(`Warning in ${sqlFile}:`, error.message);
              }
            }
          }
        }
        console.log(`${sqlFile} executed successfully`);
      } else {
        console.log(`SQL file ${sqlFile} not found, skipping...`);
      }
    }

    // Run JavaScript seed files
    const seedFiles = [
      'seed_categories.js',
      'seed_messages.js',
      'seed_notifications.js',
      'seed_orders.js'
    ];

    for (const seedFile of seedFiles) {
      const filePath = path.join(__dirname, seedFile);
      if (fs.existsSync(filePath)) {
        console.log(`Running ${seedFile}...`);
        try {
          require(filePath);
          console.log(`${seedFile} executed successfully`);
        } catch (error) {
          console.error(`Error in ${seedFile}:`, error.message);
        }
      }
    }

    console.log('Database initialization completed successfully!');

  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
