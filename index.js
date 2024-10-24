import express from 'express';
import dotenv from 'dotenv';
import api from './routes/router.js';
import userRouter from './routes/user.js';
import database from './config/db.js';
import logger from './middleware/logger.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import methodNotAllowed from './middleware/allowedMethod.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(logger);

// Routes
app.get('/', (req, res) => {
  res.redirect(301, 'api/status');
});

// Routers
app.use('/api', api);
app.use('/api/user', userRouter);

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
