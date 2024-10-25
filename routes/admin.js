import express from 'express';
import { authJWT } from '../middleware/authMiddleware.js';
import { authorizeAdmin } from '../middleware/roleMiddleware.js';
import { userList } from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.get('/', authJWT, authorizeAdmin, express.json(), (req, res) => {
  return res.status(200).json({ message: 'Admin Dashboard' });
});

adminRouter.get('/users', authJWT, authorizeAdmin, express.json(), userList);

export default adminRouter;
