/**
 * User Information Utility
 * Extracts time zone, browser, and device information from requests
 */

class UserInfo {
    /**
     * Detect user's time zone from request headers
     * @param {Object} req - Express request object
     * @returns {string} - Time zone string (e.g., 'Africa/Nairobi', 'America/New_York')
     */
    static detectTimeZone(req) {
        // Try to get from various sources
        let timeZone = 'UTC'; // default

        // Check if time zone is stored in session
        if (req.session && req.session.timeZone) {
            timeZone = req.session.timeZone;
        }

        // Try to detect from Accept-Language header (rough estimation)
        // This is not perfect but provides a fallback
        const acceptLanguage = req.get('Accept-Language');
        if (acceptLanguage) {
            // Simple mapping of language to common time zones
            const langToTimeZone = {
                'en-US': 'America/New_York',
                'en-GB': 'Europe/London',
                'en-AU': 'Australia/Sydney',
                'en-CA': 'America/Toronto',
                'fr-FR': 'Europe/Paris',
                'de-DE': 'Europe/Berlin',
                'es-ES': 'Europe/Madrid',
                'it-IT': 'Europe/Rome',
                'pt-BR': 'America/Sao_Paulo',
                'ja-JP': 'Asia/Tokyo',
                'ko-KR': 'Asia/Seoul',
                'zh-CN': 'Asia/Shanghai',
                'zh-TW': 'Asia/Taipei',
                'ar-SA': 'Asia/Riyadh',
                'hi-IN': 'Asia/Kolkata',
                'ru-RU': 'Europe/Moscow',
                'tr-TR': 'Europe/Istanbul',
                'nl-NL': 'Europe/Amsterdam',
                'sv-SE': 'Europe/Stockholm',
                'da-DK': 'Europe/Copenhagen',
                'no-NO': 'Europe/Oslo',
                'fi-FI': 'Europe/Helsinki',
                'pl-PL': 'Europe/Warsaw',
                'cs-CZ': 'Europe/Prague',
                'hu-HU': 'Europe/Budapest',
                'ro-RO': 'Europe/Bucharest',
                'bg-BG': 'Europe/Sofia',
                'hr-HR': 'Europe/Zagreb',
                'sl-SI': 'Europe/Ljubljana',
                'sk-SK': 'Europe/Bratislava',
                'et-EE': 'Europe/Tallinn',
                'lv-LV': 'Europe/Riga',
                'lt-LT': 'Europe/Vilnius',
                'mt-MT': 'Europe/Malta',
                'el-GR': 'Europe/Athens',
                'he-IL': 'Asia/Jerusalem',
                'th-TH': 'Asia/Bangkok',
                'vi-VN': 'Asia/Ho_Chi_Minh',
                'id-ID': 'Asia/Jakarta',
                'ms-MY': 'Asia/Kuala_Lumpur',
                'fil-PH': 'Asia/Manila',
                'sw-KE': 'Africa/Nairobi', // Added for Kenya
                'am-ET': 'Africa/Addis_Ababa',
                'ha-NG': 'Africa/Lagos',
                'yo-NG': 'Africa/Lagos',
                'ig-NG': 'Africa/Lagos',
                'zu-ZA': 'Africa/Johannesburg',
                'xh-ZA': 'Africa/Johannesburg',
                'af-ZA': 'Africa/Johannesburg',
                'st-LS': 'Africa/Maseru',
                'tn-BW': 'Africa/Gaborone',
                'sn-ZW': 'Africa/Harare',
                'ny-MW': 'Africa/Blantyre'
            };

            const primaryLang = acceptLanguage.split(',')[0].split(';')[0];
            if (langToTimeZone[primaryLang]) {
                timeZone = langToTimeZone[primaryLang];
            }
        }

        return timeZone;
    }

    /**
     * Parse user agent string to extract browser and device information
     * @param {string} userAgent - User agent string
     * @returns {Object} - Parsed browser and device information
     */
    static parseUserAgent(userAgent) {
        if (!userAgent) {
            return {
                browser: 'Unknown',
                browserVersion: 'Unknown',
                deviceType: 'Unknown',
                os: 'Unknown',
                osVersion: 'Unknown'
            };
        }

        const ua = userAgent.toLowerCase();
        let browser = 'Unknown';
        let browserVersion = 'Unknown';
        let deviceType = 'desktop'; // default
        let os = 'Unknown';
        let osVersion = 'Unknown';

        // Detect OS
        if (ua.includes('windows nt')) {
            os = 'Windows';
            const match = ua.match(/windows nt (\d+\.\d+)/);
            if (match) {
                const version = match[1];
                const versionMap = {
                    '10.0': '10',
                    '6.3': '8.1',
                    '6.2': '8',
                    '6.1': '7',
                    '6.0': 'Vista',
                    '5.1': 'XP'
                };
                osVersion = versionMap[version] || version;
            }
        } else if (ua.includes('mac os x') || ua.includes('macos')) {
            os = 'macOS';
            const match = ua.match(/mac os x (\d+[_\d]+)/);
            if (match) {
                osVersion = match[1].replace(/_/g, '.');
            }
        } else if (ua.includes('linux')) {
            os = 'Linux';
        } else if (ua.includes('android')) {
            os = 'Android';
            const match = ua.match(/android (\d+\.\d+)/);
            if (match) {
                osVersion = match[1];
            }
            deviceType = 'mobile';
        } else if (ua.includes('iphone') || ua.includes('ipad')) {
            os = 'iOS';
            const match = ua.match(/os (\d+[_\d]+)/);
            if (match) {
                osVersion = match[1].replace(/_/g, '.');
            }
            deviceType = ua.includes('ipad') ? 'tablet' : 'mobile';
        }

        // Detect device type more specifically
        if (ua.includes('mobile') && !ua.includes('ipad')) {
            deviceType = 'mobile';
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
            deviceType = 'tablet';
        } else if (ua.includes('tv') || ua.includes('smarttv')) {
            deviceType = 'tv';
        }

        // Detect browser
        if (ua.includes('chrome') && !ua.includes('edg/') && !ua.includes('opr/')) {
            browser = 'Chrome';
            const match = ua.match(/chrome\/(\d+\.\d+)/);
            if (match) browserVersion = match[1];
        } else if (ua.includes('firefox')) {
            browser = 'Firefox';
            const match = ua.match(/firefox\/(\d+\.\d+)/);
            if (match) browserVersion = match[1];
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
            browser = 'Safari';
            const match = ua.match(/version\/(\d+\.\d+)/);
            if (match) browserVersion = match[1];
        } else if (ua.includes('edg/')) {
            browser = 'Edge';
            const match = ua.match(/edg\/(\d+\.\d+)/);
            if (match) browserVersion = match[1];
        } else if (ua.includes('opr/') || ua.includes('opera')) {
            browser = 'Opera';
            const match = ua.match(/opr\/(\d+\.\d+)/) || ua.match(/opera\/(\d+\.\d+)/);
            if (match) browserVersion = match[1];
        } else if (ua.includes('msie') || ua.includes('trident')) {
            browser = 'Internet Explorer';
            const match = ua.match(/msie (\d+\.\d+)/) || ua.match(/rv:(\d+\.\d+)/);
            if (match) browserVersion = match[1];
        }

        return {
            browser,
            browserVersion,
            deviceType,
            os,
            osVersion
        };
    }

    /**
     * Get current timestamp in user's time zone
     * @param {string} timeZone - Time zone string
     * @returns {Date} - Date object in user's time zone
     */
    static getUserTimeZoneTimestamp(timeZone = 'UTC') {
        try {
            // For server-side, we'll use UTC and store the time zone info
            // In a real application, you might want to use a library like moment-timezone
            // to properly convert timestamps to user time zones
            return new Date();
        } catch (error) {
            console.error('Error getting user timezone timestamp:', error);
            return new Date();
        }
    }

    /**
     * Extract comprehensive user information from request
     * @param {Object} req - Express request object
     * @returns {Object} - Complete user information object
     */
    static getCompleteUserInfo(req) {
        const timeZone = this.detectTimeZone(req);
        const userAgent = req.get('User-Agent') || '';
        const deviceInfo = this.parseUserAgent(userAgent);
        const userTimeZoneTimestamp = this.getUserTimeZoneTimestamp(timeZone);

        return {
            ip: req.ip,
            timeZone,
            userTimeZoneTimestamp,
            userAgent,
            ...deviceInfo
        };
    }
}

module.exports = UserInfo;