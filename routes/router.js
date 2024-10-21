import express from 'express';
import multer from 'multer';

import { register, login } from '../controllers/auth.js';

const api = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

api.get('/status', (req, res) => {
  return res.status(200).json({ status: 'Running' });
});

api.post('/register', upload.single('profilePhoto'), register);

api.post('/login', express.json(), login);

export default api;
