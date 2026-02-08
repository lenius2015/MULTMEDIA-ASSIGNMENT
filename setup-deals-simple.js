const db = require('./db');

async function setupDeals() {
    try {
        console.log('Setting up deals database schema...');
        
        // Read SQL file
        const fs = require('fs');
        const sql = fs.readFileSync('db_deals.sql', 'utf8');

        // Execute SQL in chunks to handle multiple statements
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            try {
                await db.execute(statement.trim());
            } catch (error) {
                // Ignore errors for statements that might already exist
                if (!error.message.includes('already exists') && 
                    !error.message.includes('Duplicate') &&
                    !error.message.includes('already exists')) {
                    console.log('Statement:', statement.substring(0, 100));
                    console.log('Error:', error.message);
                }
            }
        }
        
        console.log('✓ Deals database schema setup completed!');
        
        // Test if tables were created
        try {
            const [deals] = await db.execute('SELECT COUNT(*) as count FROM deals');
            console.log(`✓ Found ${deals[0].count} deals`);
        } catch (error) {
            console.log('Deals table not found yet');
        }
        
    } catch (error) {
        console.error('Error setting up deals:', error);
    }
}

setupDeals();