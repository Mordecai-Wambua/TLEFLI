import Queue from 'bull';
import Redis from 'ioredis';
import logger from '../utils/logger.js';
import { uploadFile } from './bucket.js';
import { ApiError } from './ApiError.js';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} from '../mailtrap/emails.js';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

// Check Redis connection
(async function checkRedisConnection() {
  const redisClient = new Redis(redisConfig);

  try {
    await redisClient.ping(); // Ping Redis to check connectivity
    console.log('Successfully connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    process.exit(1); // Exit the process if Redis connection fails
  } finally {
    redisClient.disconnect(); // Clean up the connection after testing
  }
})();

// Queue options
const queueOptions = {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: 5000,
    removeOnComplete: true,
    removeOnFail: false,
  },
};

// Initialize queues
export const fileUploadQueue = new Queue('fileUpload', queueOptions);
export const emailQueue = new Queue('emailQueue', queueOptions);

// File Upload Processor
fileUploadQueue.process(async (job) => {
  try {
    const { photoData, contentType, imageName } = job.data;
    await uploadFile({ photoData, contentType }, imageName);
    const logData = {
      message: {
        task: `File uploaded successfully: ${imageName}`,
        statusCode: 200,
        success: true,
      },
    };

    logger.info(logData);
  } catch (error) {
    console.error(`File upload failed: ${error}`);
    throw new ApiError(500, `Error uploading file: ${error}`);
  }
});

// Email Sending Processor
emailQueue.process(async (job) => {
  try {
    const { emailType, userEmail, verificationToken, name, url } = job.data;

    switch (emailType) {
      case 'verification':
        await sendVerificationEmail(userEmail, verificationToken);
        break;
      case 'welcome':
        await sendWelcomeEmail(userEmail, name);
        break;
      case 'passwordReset':
        await sendPasswordResetEmail(userEmail, url);
        break;
      case 'resetSuccess':
        await sendResetSuccessEmail(userEmail);
        break;
      default:
        throw new ApiError(500, `Unknown email type: ${emailType}`);
    }

    const logData = {
      message: {
        task: `Email of type ${emailType} sent successfully to ${userEmail}`,
        statusCode: 200,
        success: true,
      },
    };

    logger.info(logData);
  } catch (error) {
    throw new ApiError(500, `Error sending email: ${error}`);
  }
});
