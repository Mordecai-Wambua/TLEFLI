import express from 'express';
import { register, login, refreshToken } from '../controllers/auth.js';
import { getLostItems, getFoundItems } from '../controllers/items.js';
import uploadMiddleware from '../middleware/uploadMiddleware.js';

const api = express.Router();

api.get('/', (req, res) => {
  res.redirect(301, '/api/status');
});

api.get('/status', (req, res) => {
  return res.status(200).json({ status: 'Running' });
});

api.post('/register', uploadMiddleware('profilePhoto'), register);

api.post('/login', login);

api.post('/refresh', refreshToken);

api.get('/lost-items', getLostItems);

api.get('/found-items', getFoundItems);

export default api;
