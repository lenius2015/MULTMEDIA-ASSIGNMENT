/**
 * Deals Scheduler Service
 * Handles deal expiry, auto-renewal, and notifications
 * 
 * Run with: node scheduler/deals-scheduler.js
 * Or integrate with node-cron in main server
 */

const db = require('../db');

// Configuration
const CONFIG = {
    CHECK_INTERVAL_MS: 60000, // Check every minute
    NOTIFY_BEFORE_MINUTES: 30, // Notify 30 min before expiry
    BATCH_SIZE: 100
};

/**
 * Update deal statuses based on dates
 */
async function updateDealStatuses() {
    try {
        const now = new Date();
        
        // 1. Expire deals past end_date
        const [expiredResult] = await db.query(`
            UPDATE deals 
            SET status = 'expired' 
            WHERE status IN ('active', 'paused', 'scheduled') 
            AND end_date < NOW()
        `);
        
        if (expiredResult.affectedRows > 0) {
            console.log(`[${new Date().toISOString()}] Expired ${expiredResult.affectedRows} deals`);
        }

        // 2. Activate deals within date range
        const [activatedResult] = await db.query(`
            UPDATE deals 
            SET status = 'active' 
            WHERE status = 'scheduled' 
            AND start_date <= NOW() 
            AND end_date > NOW()
        `);
        
        if (activatedResult.affectedRows > 0) {
            console.log(`[${new Date().toISOString()}] Activated ${activatedResult.affectedRows} deals`);
        }

        // 3. Mark sold out deals
        const [soldOutResult] = await db.query(`
            UPDATE deals 
            SET status = 'sold_out' 
            WHERE status = 'active' 
            AND available_stock <= 0 
            AND max_total_limit > 0
        `);
        
        if (soldOutResult.affectedRows > 0) {
            console.log(`[${new Date().toISOString()}] Marked ${soldOutResult.affectedRows} deals as sold out`);
        }

        // 4. Check for auto-renew deals
        const [autoRenewResult] = await db.query(`
            SELECT id, name FROM deals 
            WHERE is_auto_renew = TRUE 
            AND status = 'expired'
            AND end_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        for (const deal of autoRenewResult) {
            // Log auto-renew opportunity
            console.log(`Deal "${deal.name}" (ID: ${deal.id}) is eligible for auto-renewal`);
        }

        return {
            expired: expiredResult.affectedRows,
            activated: activatedResult.affectedRows,
            soldOut: soldOutResult.affectedRows
        };
    } catch (error) {
        console.error('Error updating deal statuses:', error);
        throw error;
    }
}

/**
 * Send deal notifications
 */
async function sendDealNotifications() {
    try {
        const notifyBefore = new Date(Date.now() + CONFIG.NOTIFY_BEFORE_MINUTES * 60 * 1000);

        // Find deals ending soon
        const [endingSoon] = await db.query(`
            SELECT d.id, d.name, d.end_date,
                   (SELECT COUNT(*) FROM deal_notifications 
                    WHERE deal_id = d.id AND type = 'ending_soon') as already_notified
            FROM deals d
            WHERE d.status = 'active'
            AND d.end_date BETWEEN NOW() AND ?
            AND d.end_date > NOW()
        `, [notifyBefore]);

        for (const deal of endingSoon) {
            if (deal.already_notified === 0) {
                // Log notification (in production, send emails/push notifications)
                console.log(`[NOTIFICATION] Deal "${deal.name}" ending soon at ${deal.end_date}`);
                
                // Mark as notified
                await db.query(`
                    INSERT INTO deal_notifications (deal_id, type, message, is_sent, sent_at)
                    VALUES (?, 'ending_soon', 'Deal ending soon', TRUE, NOW())
                `, [deal.id]);
            }
        }

        // Find deals starting soon
        const startBefore = new Date(Date.now() + CONFIG.NOTIFY_BEFORE_MINUTES * 60 * 1000);
        const [startingSoon] = await db.query(`
            SELECT d.id, d.name, d.start_date,
                   (SELECT COUNT(*) FROM deal_notifications 
                    WHERE deal_id = d.id AND type = 'starting_soon') as already_notified
            FROM deals d
            WHERE d.status = 'scheduled'
            AND d.start_date BETWEEN NOW() AND ?
        `, [startBefore]);

        for (const deal of startingSoon) {
            if (deal.already_notified === 0) {
                console.log(`[NOTIFICATION] Deal "${deal.name}" starting at ${deal.start_date}`);
                
                await db.query(`
                    INSERT INTO deal_notifications (deal_id, type, message, is_sent, sent_at)
                    VALUES (?, 'starting_soon', 'Deal starting soon', TRUE, NOW())
                `, [deal.id]);
            }
        }

        return {
            endingSoon: endingSoon.length,
            startingSoon: startingSoon.length
        };
    } catch (error) {
        console.error('Error sending notifications:', error);
        throw error;
    }
}

/**
 * Clean up old data
 */
async function cleanupOldData() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Archive old expired deals
        const [archived] = await db.query(`
            INSERT INTO deal_activity_log (deal_id, action, new_values, performed_by)
            SELECT id, 'archived', JSON_OBJECT('status', status, 'end_date', end_date), -1
            FROM deals 
            WHERE status = 'expired'
            AND end_date < ?
            AND id NOT IN (SELECT DISTINCT deal_id FROM deal_activity_log WHERE action = 'archived')
        `, [thirtyDaysAgo]);

        if (archived.affectedRows > 0) {
            console.log(`[${new Date().toISOString()}] Archived ${archived.affectedRows} old deals`);
        }

        // Clean old notifications
        const [cleanedNotifications] = await db.query(`
            DELETE FROM deal_notifications 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND is_sent = TRUE
        `);

        console.log(`[${new Date().toISOString()}] Cleaned ${cleanedNotifications.affectedRows} old notifications`);

        return {
            archived: archived.affectedRows,
            notificationsCleaned: cleanedNotifications.affectedRows
        };
    } catch (error) {
        console.error('Error cleaning up:', error);
        throw error;
    }
}

/**
 * Generate deals report
 */
async function generateReport() {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_deals,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_deals,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_deals,
                SUM(sold_count) as total_sold,
                SUM(view_count) as total_views,
                SUM(conversion_count) as total_conversions
            FROM deals
            WHERE created_at >= ?
        `, [startOfDay]);

        const [topDeals] = await db.query(`
            SELECT name, sold_count, conversion_count, view_count,
                   ROUND(conversion_count * 100.0 / NULLIF(view_count, 0), 2) as conversion_rate
            FROM deals
            ORDER BY sold_count DESC
            LIMIT 5
        `);

        return {
            date: startOfDay.toISOString().split('T')[0],
            summary: stats[0],
            topDeals
        };
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
}

/**
 * Main scheduler loop
 */
async function runScheduler() {
    console.log(`[${new Date().toISOString()}] Deals Scheduler started`);
    
    let iteration = 0;

    const interval = setInterval(async () => {
        iteration++;
        console.log(`\n--- Scheduler Iteration ${iteration} ---`);

        try {
            // 1. Update deal statuses
            const statuses = await updateDealStatuses();
            
            // 2. Send notifications
            const notifications = await sendDealNotifications();
            
            // 3. Cleanup old data (every 100 iterations ~1.5 hours)
            if (iteration % 100 === 0) {
                await cleanupOldData();
            }

            // Log summary
            console.log(`Status update: ${JSON.stringify(statuses)}`);
            console.log(`Notifications: ${JSON.stringify(notifications)}`);
            
        } catch (error) {
            console.error('Scheduler error:', error);
        }
    }, CONFIG.CHECK_INTERVAL_MS);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nShutting down scheduler...');
        clearInterval(interval);
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\nShutting down scheduler...');
        clearInterval(interval);
        process.exit(0);
    });
}

// Run if executed directly
if (require.main === module) {
    runScheduler();
}

module.exports = {
    updateDealStatuses,
    sendDealNotifications,
    cleanupOldData,
    generateReport,
    runScheduler
};
