import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import api from './routes/router.js';
import userRouter from './routes/user.js';
import adminRouter from './routes/admin.js';
import database from './config/db.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import methodNotAllowed from './middleware/allowedMethod.js';
import morgan from './utils/morgan.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(morgan);
app.set('trust proxy', true);

// Routes
app.get('/', (req, res) => {
  res.redirect(301, 'api/status');
});

// Routers
app.use('/api', api);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);

// Method not allowed middleware
app.use(methodNotAllowed);

// Not found middleware
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB and start server
(async () => {
  await database.connect();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    await database.disconnect();
    console.log('Server shutting down gracefully');
    process.exit(0);
  });
})();
