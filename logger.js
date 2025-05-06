// logger.js - Centralized logging utility

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log formats
const { format } = winston;
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Custom format for console output
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp, ...metadata }) => {
    let metaStr = '';
    if (Object.keys(metadata).length > 0 && metadata.stack !== undefined) {
      metaStr = `\n${metadata.stack}`;
    } else if (Object.keys(metadata).length > 0) {
      metaStr = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : '';
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Get log level from environment or default to info
const logLevel = process.env.LOG_LEVEL || 'info';

// Create winston logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'otp-service' },
  transports: [
    // Write logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

/**
 * Log sensitive data securely by obfuscating it
 * @param {string} data - The sensitive data to mask
 * @param {Object} options - Options for masking
 * @returns {string} - The masked data
 */
const maskSensitiveData = (data, options = {}) => {
  if (!data || typeof data !== 'string') return data;
  
  const { showFirst = 4, showLast = 2 } = options;
  
  if (data.length <= showFirst + showLast) {
    return '*'.repeat(data.length);
  }
  
  return `${data.substring(0, showFirst)}${'*'.repeat(data.length - showFirst - showLast)}${data.slice(-showLast)}`;
};

/**
 * Enhanced logger with additional utility methods
 */
const enhancedLogger = {
  // Pass through standard log levels
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Log HTTP requests
  httpRequest: (req, options = {}) => {
    if (!req) return;
    
    const { maskHeaders = ['authorization', 'cookie'] } = options;
    const headers = { ...req.headers };
    
    // Mask sensitive headers
    maskHeaders.forEach(header => {
      if (headers[header]) {
        headers[header] = maskSensitiveData(headers[header]);
      }
    });
    
    logger.info(`HTTP ${req.method} ${req.url}`, {
      headers,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  },
  
  // Log HTTP responses
  httpResponse: (res, responseTime, options = {}) => {
    logger.info(`HTTP Response: ${res.statusCode}`, {
      responseTime: `${responseTime}ms`,
      contentLength: res.getHeader('content-length'),
      contentType: res.getHeader('content-type')
    });
  },
  
  // Log API calls
  apiCall: (url, method, options = {}) => {
    const { maskQueryParams = ['token', 'apiKey'] } = options;
    const urlObj = new URL(url);
    
    // Mask sensitive query parameters
    const searchParams = new URLSearchParams(urlObj.search);
    maskQueryParams.forEach(param => {
      if (searchParams.has(param)) {
        searchParams.set(param, maskSensitiveData(searchParams.get(param)));
      }
    });
    
    logger.info(`API ${method} call to ${urlObj.origin}${urlObj.pathname}`, {
      params: Object.fromEntries(searchParams),
      timestamp: new Date().toISOString()
    });
  },
  
  // Utility for masking sensitive data
  maskSensitiveData,
  
  // Create a child logger with additional metadata
  child: (additionalMeta) => {
    const childLogger = logger.child(additionalMeta);
    return {
      error: (message, meta = {}) => childLogger.error(message, meta),
      warn: (message, meta = {}) => childLogger.warn(message, meta),
      info: (message, meta = {}) => childLogger.info(message, meta),
      debug: (message, meta = {}) => childLogger.debug(message, meta)
    };
  },
  
  // Create request-specific logger with request ID
  requestLogger: (requestId) => {
    return enhancedLogger.child({ requestId });
  },
  
  // Measure and log execution time of functions
  measure: async (name, func) => {
    const start = Date.now();
    try {
      const result = await func();
      const duration = Date.now() - start;
      logger.debug(`${name} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`${name} failed after ${duration}ms`, { error });
      throw error;
    }
  }
};

module.exports = enhancedLogger;