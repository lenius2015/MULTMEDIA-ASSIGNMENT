const mysql = require('mysql2/promise');
const fs = require('fs');

async function applySchemaFix() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ecommerce',
        port: process.env.DB_PORT || 4306
    });

    try {
        console.log('Applying schema fix for conversations table...');
        
        // Read the SQL file and split into individual statements
        const sql = fs.readFileSync('fix-conversations-schema.sql', 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        // Execute each statement individually
        for (const statement of statements) {
            if (statement.trim().startsWith('--') || statement.trim().length === 0) {
                continue; // Skip comments
            }
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await connection.execute(statement);
        }
        
        console.log('Schema fix applied successfully!');
        
    } catch (error) {
        console.error('Error applying schema fix:', error);
    } finally {
        await connection.end();
    }
}

applySchemaFix();