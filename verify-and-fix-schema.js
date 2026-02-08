const mysql = require('mysql2/promise');

async function verifyAndFixSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce',
        port: process.env.DB_PORT || 4306
    });

    try {
        console.log('Verifying conversations table schema...');
        
        // Check if last_activity_at column exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'conversations' 
            AND COLUMN_NAME = 'last_activity_at'
        `, [process.env.DB_NAME || 'ecommerce']);

        if (columns.length === 0) {
            console.log('Column last_activity_at not found. Adding it...');
            
            // Add the missing column
            await connection.execute(`
                ALTER TABLE conversations ADD COLUMN last_activity_at TIMESTAMP NULL DEFAULT NULL
            `);
            
            // Update existing records
            await connection.execute(`
                UPDATE conversations SET last_activity_at = last_message_at WHERE last_activity_at IS NULL
            `);
            
            // Add index
            await connection.execute(`
                ALTER TABLE conversations ADD INDEX idx_last_activity_at (last_activity_at)
            `);
            
            console.log('Column last_activity_at added successfully!');
        } else {
            console.log('Column last_activity_at already exists.');
        }
        
        // Verify the column was added
        const [verify] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'conversations' 
            AND COLUMN_NAME = 'last_activity_at'
        `, [process.env.DB_NAME || 'ecommerce']);
        
        console.log('Column verification:', verify);
        
    } catch (error) {
        console.error('Error verifying/fixing schema:', error);
    } finally {
        await connection.end();
    }
}

verifyAndFixSchema();