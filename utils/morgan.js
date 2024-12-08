import logger from './logger.js';
import morgan from 'morgan';

// Custom token for extracting IP
morgan.token('ip', (req) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (ip && ip.indexOf(',') !== -1) {
    ip = ip.split(',')[0]; // Get the first IP from the X-Forwarded-For header
  }
  return ip === '::1' ? '127.0.0.1' : ip;
});

// Custom token for timestamp
morgan.token('timestamp', () => new Date().toISOString());

// Morgan format string
const morganFormat = ':ip :method :url :status :response-time ms';

// Custom stream to log in structured format
export default morgan(morganFormat, {
  skip: (req, res) => res.statusCode >= 400,
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
