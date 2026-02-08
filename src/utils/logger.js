/**
 * Logging Utility
 * Handles application logging with different severity levels
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Format log message
 */
function formatLog(level, message, data = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  });
}

/**
 * Write log to file
 */
function writeLog(level, message, data = {}) {
  const timestamp = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `${level.toLowerCase()}-${timestamp}.log`);
  const logMessage = formatLog(level, message, data) + '\n';

  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

const logger = {
  error: (message, data = {}) => {
    const logMessage = `[ERROR] ${message}`;
    console.error(logMessage, data);
    writeLog(LogLevel.ERROR, message, data);
  },

  warn: (message, data = {}) => {
    const logMessage = `[WARN] ${message}`;
    console.warn(logMessage, data);
    writeLog(LogLevel.WARN, message, data);
  },

  info: (message, data = {}) => {
    const logMessage = `[INFO] ${message}`;
    console.log(logMessage, data);
    writeLog(LogLevel.INFO, message, data);
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = `[DEBUG] ${message}`;
      console.debug(logMessage, data);
      writeLog(LogLevel.DEBUG, message, data);
    }
  },

  activity: (userId, action, description, metadata = {}) => {
    logger.info('User Activity', {
      userId,
      action,
      description,
      ...metadata
    });
  }
};

module.exports = logger;
