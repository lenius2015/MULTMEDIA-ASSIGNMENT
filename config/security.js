/**
 * Security Configuration for OMUNJU SHOPPERS E-commerce Website
 * Comprehensive security settings and middleware
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
// const mongoSanitize = require('express-mongo-sanitize'); // Not needed for MySQL - incompatible with Express v5
// const xss = require('xss-clean'); // Deprecated and incompatible with Express v5
const cors = require('cors');

// Security configuration object
const securityConfig = {
    // Rate limiting settings
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 100 : 5000, // Much more lenient in development
        message: {
            success: false,
            message: 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for static assets in development
            if (process.env.NODE_ENV !== 'production') {
                return req.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/i);
            }
            return false;
        }
    },

    // Strict rate limiting for auth endpoints
    authRateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 5 : 50, // More lenient in development
        message: {
            success: false,
            message: 'Too many authentication attempts, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    },

    // CORS configuration
    cors: {
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, etc.)
            if (!origin) return callback(null, true);

            const allowedOrigins = [
                'http://localhost:3000',
                'https://localhost:3000',
                process.env.FRONTEND_URL,
                process.env.ADMIN_URL
            ].filter(Boolean);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },

    // Helmet security headers
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
                scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
                imgSrc: ["'self'", "data:", "https:", "http:", "blob:"], // Added blob: for file uploads
                connectSrc: ["'self'", "ws:", "wss:"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        xssFilter: true,
        hidePoweredBy: true
    },

    // Session security
    session: {
        name: 'omunju_session', // Don't use default session name
        secret: process.env.SESSION_SECRET || 'fallback_super_secure_secret_change_this_immediately',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            httpOnly: true, // Prevent XSS attacks
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict' // CSRF protection
        }
    },

    // Password security
    password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        saltRounds: 12
    },

    // File upload security
    upload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxFiles: 10
    },

    // API security
    api: {
        maxRequestSize: '10mb',
        timeout: 30000, // 30 seconds
        compression: true
    }
};

// Security middleware functions
const securityMiddleware = {
    // Apply all security headers
    securityHeaders: helmet(securityConfig.helmet),

    // Rate limiting
    generalRateLimit: rateLimit(securityConfig.rateLimit),
    authRateLimit: rateLimit(securityConfig.authRateLimit),

    // CORS
    cors: cors(securityConfig.cors),

    // Data sanitization
    dataSanitization: [
        // Prevent NoSQL injection - Not needed for MySQL, incompatible with Express v5
        // mongoSanitize(),
        // Prevent XSS attacks - xss-clean is deprecated and incompatible with Express v5
        // xss(),
        // Prevent HTTP Parameter Pollution
        hpp()
    ],

    // Request size limiting
    requestSizeLimit: require('express').json({ limit: securityConfig.api.maxRequestSize }),

    // Compression
    compression: require('compression')(),

    // Security logging middleware
    securityLogger: (req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            const logData = {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.session ? (req.session.userId || req.session.adminId) : null
            };

            // Log suspicious activities
            if (res.statusCode >= 400) {
                console.warn('Security Event:', logData);
            }

            // Log slow requests
            if (duration > 5000) {
                console.warn('Slow Request:', logData);
            }
        });

        next();
    },

    // IP blocking middleware
    ipBlocker: (req, res, next) => {
        const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [];
        const clientIP = req.ip || req.connection.remoteAddress;

        if (blockedIPs.includes(clientIP)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Your IP address has been blocked.'
            });
        }

        next();
    },

    // SQL injection prevention (additional layer)
    sqlInjectionPrevention: (req, res, next) => {
        const suspiciousPatterns = [
            /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
            /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\%27)|(\%23))/i,
            /(<script|javascript:|vbscript:|onload=|onerror=)/i
        ];

        const checkValue = (value) => {
            if (typeof value === 'string') {
                return suspiciousPatterns.some(pattern => pattern.test(value));
            }
            return false;
        };

        const checkObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (checkObject(obj[key])) return true;
                } else if (checkValue(obj[key])) {
                    return true;
                }
            }
            return false;
        };

        if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request data detected.'
            });
        }

        next();
    }
};

// Security utility functions
const securityUtils = {
    // Validate password strength
    validatePassword: (password) => {
        const config = securityConfig.password;

        if (password.length < config.minLength) {
            return { valid: false, message: `Password must be at least ${config.minLength} characters long` };
        }

        if (config.requireUppercase && !/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }

        if (config.requireLowercase && !/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }

        if (config.requireNumbers && !/\d/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }

        if (config.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one special character' };
        }

        return { valid: true };
    },

    // Sanitize input
    sanitizeInput: (input) => {
        if (typeof input !== 'string') return input;

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    },

    // Generate secure random token
    generateSecureToken: (length = 32) => {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    },

    // Hash password securely
    hashPassword: async (password) => {
        const bcrypt = require('bcryptjs');
        return await bcrypt.hash(password, securityConfig.password.saltRounds);
    },

    // Verify password
    verifyPassword: async (password, hash) => {
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(password, hash);
    },

    // Check if user is super admin (only the original admin)
    isOriginalSuperAdmin: async (adminId) => {
        const pool = require('../db');
        try {
            const [admins] = await pool.query(
                'SELECT id FROM admins WHERE id = ? AND created_by IS NULL',
                [adminId]
            );
            return admins.length > 0;
        } catch (error) {
            console.error('Error checking original super admin:', error);
            return false;
        }
    }
};

module.exports = {
    securityConfig,
    securityMiddleware,
    securityUtils
};