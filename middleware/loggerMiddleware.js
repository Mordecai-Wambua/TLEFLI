import logger from '../utils/logger.js';

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const status = res.statusCode;
    const ip = req.ip;

    const logMessage = `${method} ${url} ${status} ${duration}ms - IP: ${ip}`;

    if (status >= 500) {
      logger.error(logMessage);
    } else if (status >= 400) {
      logger.warn(logMessage);
    } else {
      logger.info(logMessage);
    }
  });

  next();
}

export default requestLogger;
