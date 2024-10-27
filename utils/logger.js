import winston from 'winston';
import 'winston-daily-rotate-file';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    // Console transport for real-time logging, colorized
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'production',
    }),
    // Daily rotate file transport for log file rotation
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m', // Maximum size of each log file
      maxFiles: '14d', // Keep logs for the last 14 days
      zippedArchive: true, // Compress old log files
    }),
  ],
});

export default logger;
