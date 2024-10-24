import express from 'express';
import { register, login } from '../controllers/auth.js';
import upload from '../utils/upload.js';

const api = express.Router();

api.get('/status', (req, res) => {
  return res.status(200).json({ status: 'Running' });
});

api.post('/register', upload.single('profilePhoto'), register);

api.post('/login', express.json(), login);

export default api;
