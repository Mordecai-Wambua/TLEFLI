import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

function ipGet(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (ip && ip.indexOf(',') !== -1) {
    ip = ip.split(',')[0]; // Get the first IP from the X-Forwarded-For header
  }
  return ip === '::1' ? '127.0.0.1' : ip;
}

function errorHandler(err, req, res, next) {
  const logData = {
    level: 'error',
    message: {
      error: err.message,
      statusCode: err.statusCode || 500,
      success: false,
      method: req.method,
      url: req.originalUrl,
      ip: ipGet(req),
    },
  };

  logger.error(logData);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  } else {
    return res.status(500).json({ error: err.message });
  }
}

export default errorHandler;
