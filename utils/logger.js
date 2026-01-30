const db = require('../db');
const UserInfo = require('./userInfo');

/**
 * Logger utility for OMUNJU SHOPPERS E-commerce Website
 * Handles security logs, activity logs, error logs, and access logs
 * Enhanced with user time zone and detailed browser/device information
 */
class Logger {
    /**
     * Log security events
     * @param {string} level - Log level (info, warning, error, critical)
     * @param {string} message - Log message
     * @param {Object} details - Additional details including request object
     */
    static async security(level = 'info', message, details = {}) {
        try {
            const {
                ip,
                userId,
                userAgent,
                url,
                method,
                req // Express request object for enhanced info
            } = details;

            // Get enhanced user information
            const userInfo = req ? UserInfo.getCompleteUserInfo(req) : {
                ip: ip || null,
                timeZone: 'UTC',
                userTimeZoneTimestamp: new Date(),
                userAgent: userAgent || null,
                browser: 'Unknown',
                browserVersion: 'Unknown',
                deviceType: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown'
            };

            await db.query(`
                INSERT INTO security_logs (level, message, ip, user_id, user_agent, url, method,
                                         time_zone, user_timezone_timestamp, browser, browser_version,
                                         device_type, os, os_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [level, message, userInfo.ip, userId, userInfo.userAgent, url, method,
                userInfo.timeZone, userInfo.userTimeZoneTimestamp, userInfo.browser,
                userInfo.browserVersion, userInfo.deviceType, userInfo.os, userInfo.osVersion]);
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * Log user activities
     * @param {number} userId - User ID
     * @param {string} action - Action performed
     * @param {string} message - Activity description
     * @param {Object} details - Additional details including request object
     */
    static async activity(userId, action, message, details = {}) {
        try {
            const { ip, userAgent, req } = details;

            // Get enhanced user information
            const userInfo = req ? UserInfo.getCompleteUserInfo(req) : {
                ip: ip || null,
                timeZone: 'UTC',
                userTimeZoneTimestamp: new Date(),
                userAgent: userAgent || null,
                browser: 'Unknown',
                browserVersion: 'Unknown',
                deviceType: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown'
            };

            await db.query(`
                INSERT INTO activity_logs (user_id, action, message, ip, user_agent,
                                         time_zone, user_timezone_timestamp, browser, browser_version,
                                         device_type, os, os_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, action, message, userInfo.ip, userInfo.userAgent,
                userInfo.timeZone, userInfo.userTimeZoneTimestamp, userInfo.browser,
                userInfo.browserVersion, userInfo.deviceType, userInfo.os, userInfo.osVersion]);
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

    /**
     * Log errors
     * @param {string} level - Error level (error, warning, notice)
     * @param {string} message - Error message
     * @param {Object} details - Error details including request object
     */
    static async error(level = 'error', message, details = {}) {
        try {
            const {
                file,
                line,
                stackTrace,
                url,
                method,
                ip,
                userId,
                req
            } = details;

            // Get enhanced user information
            const userInfo = req ? UserInfo.getCompleteUserInfo(req) : {
                ip: ip || null,
                timeZone: 'UTC',
                userTimeZoneTimestamp: new Date(),
                userAgent: null,
                browser: 'Unknown',
                browserVersion: 'Unknown',
                deviceType: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown'
            };

            await db.query(`
                INSERT INTO error_logs (level, message, file, line, stack_trace, url, method, ip, user_id,
                                      time_zone, user_timezone_timestamp, browser, browser_version,
                                      device_type, os, os_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [level, message, file, line, stackTrace, url, method, userInfo.ip, userId,
                userInfo.timeZone, userInfo.userTimeZoneTimestamp, userInfo.browser,
                userInfo.browserVersion, userInfo.deviceType, userInfo.os, userInfo.osVersion]);
        } catch (error) {
            console.error('Failed to log error:', error);
        }
    }

    /**
     * Log access requests
     * @param {string} ip - Client IP
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {number} statusCode - Response status code
     * @param {number} responseTime - Response time in ms
     * @param {Object} details - Additional details including request object
     */
    static async access(ip, method, url, statusCode, responseTime, details = {}) {
        try {
            const { userAgent, referer, userId, req } = details;

            // Get enhanced user information
            const userInfo = req ? UserInfo.getCompleteUserInfo(req) : {
                ip: ip || null,
                timeZone: 'UTC',
                userTimeZoneTimestamp: new Date(),
                userAgent: userAgent || null,
                browser: 'Unknown',
                browserVersion: 'Unknown',
                deviceType: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown'
            };

            await db.query(`
                INSERT INTO access_logs (ip, method, url, status_code, response_time, user_agent, referer, user_id,
                                       time_zone, user_timezone_timestamp, browser, browser_version,
                                       device_type, os, os_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [userInfo.ip, method, url, statusCode, responseTime, userInfo.userAgent, referer, userId,
                userInfo.timeZone, userInfo.userTimeZoneTimestamp, userInfo.browser,
                userInfo.browserVersion, userInfo.deviceType, userInfo.os, userInfo.osVersion]);
        } catch (error) {
            console.error('Failed to log access:', error);
        }
    }

    /**
     * Log login attempts
     * @param {string} email - User email
     * @param {string} ip - Client IP
     * @param {boolean} success - Whether login was successful
     * @param {Object} details - Additional details including request object
     */
    static async loginAttempt(email, ip, success, details = {}) {
        try {
            const { userAgent, req } = details;

            // Get enhanced user information
            const userInfo = req ? UserInfo.getCompleteUserInfo(req) : {
                ip: ip || null,
                timeZone: 'UTC',
                userTimeZoneTimestamp: new Date(),
                userAgent: userAgent || null,
                browser: 'Unknown',
                browserVersion: 'Unknown',
                deviceType: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown'
            };

            await db.query(`
                INSERT INTO login_attempts (email, ip, user_agent, success,
                                          time_zone, user_timezone_timestamp, browser, browser_version,
                                          device_type, os, os_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [email, userInfo.ip, userInfo.userAgent, success,
                userInfo.timeZone, userInfo.userTimeZoneTimestamp, userInfo.browser,
                userInfo.browserVersion, userInfo.deviceType, userInfo.os, userInfo.osVersion]);
        } catch (error) {
            console.error('Failed to log login attempt:', error);
        }
    }

    /**
     * Create or update user session
     * @param {number} userId - User ID
     * @param {string} sessionId - Session ID
     * @param {Object} details - Session details including request object
     */
    static async createSession(userId, sessionId, details = {}) {
        try {
            const { ip, userAgent, req } = details;

            // Get enhanced user information
            const userInfo = req ? UserInfo.getCompleteUserInfo(req) : {
                ip: ip || null,
                timeZone: 'UTC',
                userTimeZoneTimestamp: new Date(),
                userAgent: userAgent || null,
                browser: 'Unknown',
                browserVersion: 'Unknown',
                deviceType: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown'
            };

            await db.query(`
                INSERT INTO user_sessions (user_id, session_id, ip, user_agent,
                                         time_zone, user_timezone_timestamp, browser, browser_version,
                                         device_type, os, os_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                last_activity = CURRENT_TIMESTAMP,
                ip = VALUES(ip),
                user_agent = VALUES(user_agent),
                time_zone = VALUES(time_zone),
                user_timezone_timestamp = VALUES(user_timezone_timestamp),
                browser = VALUES(browser),
                browser_version = VALUES(browser_version),
                device_type = VALUES(device_type),
                os = VALUES(os),
                os_version = VALUES(os_version)
            `, [userId, sessionId, userInfo.ip, userInfo.userAgent,
                userInfo.timeZone, userInfo.userTimeZoneTimestamp, userInfo.browser,
                userInfo.browserVersion, userInfo.deviceType, userInfo.os, userInfo.osVersion]);
        } catch (error) {
            console.error('Failed to create/update session:', error);
        }
    }

    /**
     * Update session activity
     * @param {string} sessionId - Session ID
     */
    static async updateSessionActivity(sessionId) {
        try {
            await db.query(`
                UPDATE user_sessions
                SET last_activity = CURRENT_TIMESTAMP
                WHERE session_id = ?
            `, [sessionId]);
        } catch (error) {
            console.error('Failed to update session activity:', error);
        }
    }

    /**
     * Remove session
     * @param {string} sessionId - Session ID
     */
    static async removeSession(sessionId) {
        try {
            await db.query('DELETE FROM user_sessions WHERE session_id = ?', [sessionId]);
        } catch (error) {
            console.error('Failed to remove session:', error);
        }
    }

    /**
     * Block an IP address
     * @param {string} ip - IP address to block
     * @param {string} reason - Reason for blocking
     * @param {number} blockedBy - Admin user ID who blocked
     * @param {Date} blockedUntil - When to unblock (optional)
     */
    static async blockIP(ip, reason, blockedBy, blockedUntil = null) {
        try {
            await db.query(`
                INSERT INTO blocked_ips (ip, reason, blocked_by, blocked_until)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                reason = VALUES(reason),
                blocked_by = VALUES(blocked_by),
                blocked_until = VALUES(blocked_until),
                blocked_at = CURRENT_TIMESTAMP
            `, [ip, reason, blockedBy, blockedUntil]);
        } catch (error) {
            console.error('Failed to block IP:', error);
        }
    }

    /**
     * Check if IP is blocked
     * @param {string} ip - IP address to check
     * @returns {boolean} - Whether IP is blocked
     */
    static async isIPBlocked(ip) {
        try {
            const [result] = await db.query(`
                SELECT COUNT(*) as count FROM blocked_ips
                WHERE ip = ? AND (blocked_until > NOW() OR blocked_until IS NULL)
            `, [ip]);

            return result[0].count > 0;
        } catch (error) {
            console.error('Failed to check IP block status:', error);
            return false;
        }
    }

    /**
     * Middleware to log HTTP requests
     */
    static accessLogger() {
        return (req, res, next) => {
            const startTime = Date.now();

            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                const userId = req.session ? req.session.userId : null;

                this.access(
                    req.ip,
                    req.method,
                    req.originalUrl,
                    res.statusCode,
                    responseTime,
                    {
                        userAgent: req.get('User-Agent'),
                        referer: req.get('Referer'),
                        userId,
                        req // Pass the request object for enhanced logging
                    }
                );
            });

            next();
        };
    }

    /**
     * Middleware to check for blocked IPs
     */
    static ipBlocker() {
        return async (req, res, next) => {
            const isBlocked = await this.isIPBlocked(req.ip);
            if (isBlocked) {
                this.security('critical', 'Blocked IP attempted access', {
                    ip: req.ip,
                    url: req.originalUrl,
                    method: req.method,
                    userAgent: req.get('User-Agent'),
                    req // Pass the request object for enhanced logging
                });

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Your IP address has been blocked.'
                });
            }

            next();
        };
    }
}

module.exports = Logger;