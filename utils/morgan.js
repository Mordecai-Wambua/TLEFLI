import logger from './logger.js';
import morgan from 'morgan';

// Custom token for extracting IP
morgan.token('ip', (req) => {
  const ip =
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  return ip === '::1' ? '127.0.0.1' : ip;
});

// Custom token for timestamp
morgan.token('timestamp', () => new Date().toISOString());

// Morgan format string
const morganFormat = ':ip :method :url :status :response-time ms';

// Custom stream to log in structured format
export default morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Parse the `message` into its components
      const [ip, method, url, status, responseTime] = message.trim().split(' ');

      const logObject = {
        ip,
        method,
        url,
        status,
        responseTime: responseTime.replace('ms', ''), // Remove "ms"
        timestamp: new Date().toISOString(),
      };

      logger.info(logObject);
    },
  },
});
