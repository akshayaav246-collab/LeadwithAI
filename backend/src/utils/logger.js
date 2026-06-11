const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ── Custom log format ──────────────────────────────────────────────────────
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
      : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// ── Logger instance ────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Console — coloured, for development / server dashboard
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),

    // error.log — only errors (most important file to check)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,  // 5 MB per file
      maxFiles: 5,                // Keep last 5 rotated files
    }),

    // combined.log — everything (info, warn, error)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10 MB per file
      maxFiles: 5,
    }),
  ],
});

// ── Override console methods ───────────────────────────────────────────────
// This means ALL existing console.error / console.warn / console.log calls
// anywhere in the codebase automatically get written to log files too.
const originalConsoleError = console.error.bind(console);
const originalConsoleWarn  = console.warn.bind(console);
const originalConsoleLog   = console.log.bind(console);

console.error = (...args) => {
  logger.error(args.map(a => (a instanceof Error ? a.stack : String(a))).join(' '));
};
console.warn = (...args) => {
  logger.warn(args.map(a => String(a)).join(' '));
};
console.log = (...args) => {
  logger.info(args.map(a => String(a)).join(' '));
};

// ── Capture unhandled crashes ──────────────────────────────────────────────
// These would otherwise silently crash the server
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION — server will exit: ${err.message}`, { stack: err.stack });
  originalConsoleError('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.stack : String(reason);
  logger.error(`UNHANDLED PROMISE REJECTION: ${msg}`);
});

module.exports = logger;
