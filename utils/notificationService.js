const db = require('../db');

/**
 * Notification Service for OMUNJU SHOPPERS E-commerce Website
 * Handles user notifications, admin notifications, and notification management
 */
class NotificationService {
    /**
     * Send notification to a user
     * @param {number} userId - User ID
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     */
    static async sendToUser(userId, title, message, options = {}) {
        try {
            const {
                type = 'system',
                priority = 'medium',
                relatedOrderId = null,
                relatedAuctionId = null,
                relatedProductId = null,
                actionUrl = null,
                expiresAt = null,
                sendEmail = false
            } = options;

            // Insert notification
            const [result] = await db.query(`
                INSERT INTO user_notifications (
                    user_id, title, message, type, priority,
                    related_order_id, related_auction_id, related_product_id,
                    action_url, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, title, message, type, priority,
                relatedOrderId, relatedAuctionId, relatedProductId,
                actionUrl, expiresAt
            ]);

            // Send email if requested and user has email notifications enabled
            if (sendEmail) {
                await this.sendEmailNotification(userId, title, message, type);
            }

            return result.insertId;
        } catch (error) {
            console.error('Error sending user notification:', error);
            throw error;
        }
    }

    /**
     * Send notification to admin(s)
     * @param {number|null} adminId - Specific admin ID or null for broadcast
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     */
    static async sendToAdmin(adminId = null, title, message, options = {}) {
        try {
            const {
                type = 'system',
                priority = 'medium',
                isBroadcast = false,
                relatedUserId = null,
                relatedOrderId = null,
                relatedAuctionId = null,
                actionUrl = null
            } = options;

            // Insert notification
            const [result] = await db.query(`
                INSERT INTO admin_notifications (
                    admin_id, title, message, type, priority, is_broadcast,
                    related_user_id, related_order_id, related_auction_id, action_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                adminId, title, message, type, priority, isBroadcast,
                relatedUserId, relatedOrderId, relatedAuctionId, actionUrl
            ]);

            return result.insertId;
        } catch (error) {
            console.error('Error sending admin notification:', error);
            throw error;
        }
    }

    /**
     * Send notification using template
     * @param {string} templateName - Template name
     * @param {number} recipientId - Recipient ID (user or admin)
     * @param {Object} variables - Template variables
     * @param {Object} options - Additional options
     */
    static async sendFromTemplate(templateName, recipientId, variables = {}, options = {}) {
        try {
            // Get template
            const [templates] = await db.query(
                'SELECT * FROM notification_templates WHERE name = ? AND is_active = 1',
                [templateName]
            );

            if (templates.length === 0) {
                throw new Error(`Template '${templateName}' not found`);
            }

            const template = templates[0];

            // Replace variables in message
            let title = template.subject;
            let message = template.message_template;

            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{${key}}`, 'g');
                title = title.replace(regex, variables[key]);
                message = message.replace(regex, variables[key]);
            });

            // Send notification based on template type
            if (template.type === 'user') {
                return await this.sendToUser(recipientId, title, message, {
                    type: template.category,
                    ...options
                });
            } else {
                return await this.sendToAdmin(recipientId, title, message, {
                    type: template.category,
                    ...options
                });
            }
        } catch (error) {
            console.error('Error sending template notification:', error);
            throw error;
        }
    }

    /**
     * Get user notifications
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     */
    static async getUserNotifications(userId, options = {}) {
        try {
            const {
                limit = 20,
                offset = 0,
                unreadOnly = false,
                type = null
            } = options;

            let whereClause = 'WHERE user_id = ?';
            let params = [userId];

            if (unreadOnly) {
                whereClause += ' AND is_read = 0';
            }

            if (type) {
                whereClause += ' AND type = ?';
                params.push(type);
            }

            const [notifications] = await db.query(`
                SELECT * FROM user_notifications
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            return notifications;
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    /**
     * Get admin notifications
     * @param {number|null} adminId - Admin ID or null for all
     * @param {Object} options - Query options
     */
    static async getAdminNotifications(adminId = null, options = {}) {
        try {
            const {
                limit = 20,
                offset = 0,
                unreadOnly = false,
                type = null
            } = options;

            let whereClause = '';
            let params = [];

            if (adminId) {
                whereClause += 'WHERE (admin_id = ? OR is_broadcast = 1)';
                params.push(adminId);
            } else {
                whereClause += 'WHERE admin_id IS NULL OR is_broadcast = 1';
            }

            if (unreadOnly) {
                whereClause += ' AND is_read = 0';
            }

            if (type) {
                whereClause += ' AND type = ?';
                params.push(type);
            }

            const [notifications] = await db.query(`
                SELECT * FROM admin_notifications
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            return notifications;
        } catch (error) {
            console.error('Error getting admin notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     * @param {string} type - 'user' or 'admin'
     * @param {number} notificationId - Notification ID
     * @param {number} userId - User/Admin ID for security
     */
    static async markAsRead(type, notificationId, userId) {
        try {
            const table = type === 'user' ? 'user_notifications' : 'admin_notifications';
            const idField = type === 'user' ? 'user_id' : 'admin_id';

            await db.query(`
                UPDATE ${table}
                SET is_read = 1
                WHERE id = ? AND ${idField} = ?
            `, [notificationId, userId]);

            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Delete notification
     * @param {string} type - 'user' or 'admin'
     * @param {number} notificationId - Notification ID
     * @param {number} userId - User/Admin ID for security
     */
    static async deleteNotification(type, notificationId, userId) {
        try {
            const table = type === 'user' ? 'user_notifications' : 'admin_notifications';
            const idField = type === 'user' ? 'user_id' : 'admin_id';

            await db.query(`
                DELETE FROM ${table}
                WHERE id = ? AND ${idField} = ?
            `, [notificationId, userId]);

            return true;
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    /**
     * Send email notification (placeholder - implement with actual email service)
     * @param {number} userId - User ID
     * @param {string} subject - Email subject
     * @param {string} message - Email message
     * @param {string} type - Notification type
     */
    static async sendEmailNotification(userId, subject, message, type) {
        try {
            // Get user email and check notification settings
            const [users] = await db.query(`
                SELECT u.email, COALESCE(uns.email_notifications, 1) as email_enabled
                FROM users u
                LEFT JOIN user_notification_settings uns ON u.id = uns.user_id
                WHERE u.id = ?
            `, [userId]);

            if (users.length === 0 || !users[0].email_enabled) {
                return false;
            }

            const user = users[0];

            // TODO: Implement actual email sending
            // For now, just log the email that would be sent
            console.log(`📧 Email notification for ${user.email}:`);
            console.log(`Subject: ${subject}`);
            console.log(`Message: ${message}`);
            console.log(`Type: ${type}`);

            // Mark as email sent in database
            await db.query(`
                UPDATE user_notifications
                SET is_email_sent = 1
                WHERE user_id = ? AND title = ? AND message = ?
                ORDER BY created_at DESC LIMIT 1
            `, [userId, subject, message]);

            return true;
        } catch (error) {
            console.error('Error sending email notification:', error);
            return false;
        }
    }

    /**
     * Get notification counts
     * @param {string} type - 'user' or 'admin'
     * @param {number} userId - User/Admin ID
     */
    static async getNotificationCounts(type, userId) {
        try {
            const table = type === 'user' ? 'user_notifications' : 'admin_notifications';
            const idField = type === 'user' ? 'user_id' : 'admin_id';

            let whereClause = `${idField} = ?`;
            let params = [userId];

            if (type === 'admin') {
                whereClause = `(${idField} = ? OR is_broadcast = 1)`;
            }

            const [counts] = await db.query(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
                FROM ${table}
                WHERE ${whereClause}
            `, params);

            return {
                total: counts[0].total || 0,
                unread: counts[0].unread || 0
            };
        } catch (error) {
            console.error('Error getting notification counts:', error);
            return { total: 0, unread: 0 };
        }
    }

    // Predefined notification methods for common events

    /**
     * Notify user about order status change
     */
    static async notifyOrderStatus(userId, orderId, status, orderTotal = null) {
        const statusMessages = {
            'placed': 'Your order has been placed successfully!',
            'confirmed': 'Your order has been confirmed and is being prepared.',
            'shipped': 'Your order has been shipped and is on its way!',
            'delivered': 'Your order has been delivered successfully.',
            'cancelled': 'Your order has been cancelled.'
        };

        const title = `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        const message = statusMessages[status] || `Your order status has been updated to: ${status}`;

        await this.sendToUser(userId, title, message, {
            type: 'order',
            priority: status === 'cancelled' ? 'high' : 'medium',
            relatedOrderId: orderId,
            sendEmail: true
        });

        // Notify admin about order status change
        await this.sendToAdmin(null, `Order ${status}: #${orderId}`,
            `Order #${orderId} status changed to ${status}${orderTotal ? ` (Total: $${orderTotal})` : ''}`, {
            type: 'order',
            priority: 'medium',
            relatedOrderId: orderId,
            isBroadcast: true
        });
    }

    /**
     * Notify user about auction events
     */
    static async notifyAuctionEvent(userId, auctionId, eventType, auctionData = {}) {
        const eventMessages = {
            'won': `Congratulations! You won the auction for ${auctionData.productName} with a bid of $${auctionData.winningBid}!`,
            'outbid': `You've been outbid on ${auctionData.productName}. Current highest bid: $${auctionData.currentBid}`,
            'ended': `The auction for ${auctionData.productName} has ended.`,
            'started': `The auction for ${auctionData.productName} has started!`
        };

        const title = eventType === 'won' ? 'Auction Won!' :
                     eventType === 'outbid' ? 'Outbid Notice' :
                     `Auction ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;

        const message = eventMessages[eventType] || `Auction event: ${eventType}`;

        await this.sendToUser(userId, title, message, {
            type: 'auction',
            priority: eventType === 'won' ? 'high' : 'medium',
            relatedAuctionId: auctionId,
            sendEmail: eventType === 'won'
        });
    }

    /**
     * Notify admin about new user registration
     */
    static async notifyNewUser(userId, userName, userEmail) {
        await this.sendToAdmin(null, 'New User Registration',
            `${userName} (${userEmail}) has registered on the platform.`, {
            type: 'user',
            priority: 'low',
            relatedUserId: userId,
            isBroadcast: true
        });
    }

    /**
     * Notify admin about user deletion
     */
    static async notifyUserDeleted(userId, userName, userEmail, deletedByAdminId = null) {
        await this.sendToAdmin(deletedByAdminId, 'User Account Deleted',
            `User account for ${userName} (${userEmail}) has been deleted.`, {
            type: 'user',
            priority: 'medium',
            relatedUserId: userId,
            isBroadcast: true
        });
    }

    /**
     * Notify admin about new contact message
     */
    static async notifyNewContactMessage(messageId, senderName, senderEmail, subject) {
        await this.sendToAdmin(null, 'New Contact Message',
            `New message from ${senderName} (${senderEmail}): ${subject || 'No subject'}`, {
            type: 'contact',
            priority: 'medium',
            isBroadcast: true,
            actionUrl: '/admin/messages'
        });
    }

    /**
     * Notify admin about security events
     */
    static async notifySecurityEvent(eventType, message, details = {}) {
        await this.sendToAdmin(null, `Security Alert: ${eventType}`, message, {
            type: 'security',
            priority: 'high',
            isBroadcast: true,
            ...details
        });
    }

    /**
     * Clean up old notifications (run periodically)
     */
    static async cleanupOldNotifications(daysOld = 90) {
        try {
            const [userResult] = await db.query(`
                DELETE FROM user_notifications
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
                AND is_read = 1
            `, [daysOld]);

            const [adminResult] = await db.query(`
                DELETE FROM admin_notifications
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
                AND is_read = 1
            `, [daysOld]);

            console.log(`🧹 Cleaned up ${userResult.affectedRows} old user notifications and ${adminResult.affectedRows} old admin notifications`);
        } catch (error) {
            console.error('Error cleaning up old notifications:', error);
        }
    }
}

module.exports = NotificationService;