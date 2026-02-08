/**
 * Fix missing time_zone columns in database tables
 */

const db = require('./db');

async function fixTimezoneColumns() {
    try {
        console.log('Adding missing time_zone columns to database tables...');

        // Fix login_attempts table
        try {
            await db.query(`
                ALTER TABLE login_attempts
                ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) DEFAULT 'UTC' AFTER user_agent,
                ADD COLUMN IF NOT EXISTS user_timezone_timestamp DATETIME AFTER time_zone,
                ADD COLUMN IF NOT EXISTS browser VARCHAR(100) AFTER user_timezone_timestamp,
                ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50) AFTER browser,
                ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) AFTER browser_version,
                ADD COLUMN IF NOT EXISTS os VARCHAR(100) AFTER device_type,
                ADD COLUMN IF NOT EXISTS os_version VARCHAR(50) AFTER os
            `);
            console.log('✅ login_attempts table updated');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.log('login_attempts:', err.message);
            }
        }

        // Fix activity_logs table
        try {
            await db.query(`
                ALTER TABLE activity_logs
                ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) DEFAULT 'UTC' AFTER user_agent,
                ADD COLUMN IF NOT EXISTS user_timezone_timestamp DATETIME AFTER time_zone,
                ADD COLUMN IF NOT EXISTS browser VARCHAR(100) AFTER user_timezone_timestamp,
                ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50) AFTER browser,
                ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) AFTER browser_version,
                ADD COLUMN IF NOT EXISTS os VARCHAR(100) AFTER device_type,
                ADD COLUMN IF NOT EXISTS os_version VARCHAR(50) AFTER os
            `);
            console.log('✅ activity_logs table updated');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.log('activity_logs:', err.message);
            }
        }

        // Fix user_sessions table
        try {
            await db.query(`
                ALTER TABLE user_sessions
                ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) DEFAULT 'UTC' AFTER user_agent,
                ADD COLUMN IF NOT EXISTS user_timezone_timestamp DATETIME AFTER time_zone,
                ADD COLUMN IF NOT EXISTS browser VARCHAR(100) AFTER user_timezone_timestamp,
                ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50) AFTER browser,
                ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) AFTER browser_version,
                ADD COLUMN IF NOT EXISTS os VARCHAR(100) AFTER device_type,
                ADD COLUMN IF NOT EXISTS os_version VARCHAR(50) AFTER os
            `);
            console.log('✅ user_sessions table updated');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.log('user_sessions:', err.message);
            }
        }

        // Fix security_logs table
        try {
            await db.query(`
                ALTER TABLE security_logs
                ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) DEFAULT 'UTC' AFTER user_agent,
                ADD COLUMN IF NOT EXISTS user_timezone_timestamp DATETIME AFTER time_zone,
                ADD COLUMN IF NOT EXISTS browser VARCHAR(100) AFTER user_timezone_timestamp,
                ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50) AFTER browser,
                ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) AFTER browser_version,
                ADD COLUMN IF NOT EXISTS os VARCHAR(100) AFTER device_type,
                ADD COLUMN IF NOT EXISTS os_version VARCHAR(50) AFTER os
            `);
            console.log('✅ security_logs table updated');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.log('security_logs:', err.message);
            }
        }

        // Fix error_logs table
        try {
            await db.query(`
                ALTER TABLE error_logs
                ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) DEFAULT 'UTC' AFTER user_id,
                ADD COLUMN IF NOT EXISTS user_timezone_timestamp DATETIME AFTER time_zone,
                ADD COLUMN IF NOT EXISTS browser VARCHAR(100) AFTER user_timezone_timestamp,
                ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50) AFTER browser,
                ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) AFTER browser_version,
                ADD COLUMN IF NOT EXISTS os VARCHAR(100) AFTER device_type,
                ADD COLUMN IF NOT EXISTS os_version VARCHAR(50) AFTER os
            `);
            console.log('✅ error_logs table updated');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.log('error_logs:', err.message);
            }
        }

        console.log('\n✅ All timezone columns have been added!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing timezone columns:', error);
        process.exit(1);
    }
}

fixTimezoneColumns();
