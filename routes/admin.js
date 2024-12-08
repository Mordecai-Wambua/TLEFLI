import express from 'express';
import { authJWT } from '../middleware/authMiddleware.js';
import { authorizeAdmin } from '../middleware/roleMiddleware.js';
import {
  userList,
  getUser,
  deleteUser,
  toAdmin,
  itemList,
  itemDelete,
} from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.get('/', authJWT, authorizeAdmin, (req, res) => {
  return res.status(200).json({ message: 'Admin Dashboard' });
});

adminRouter.get('/users', authJWT, authorizeAdmin, userList);

adminRouter.get('/user/:id', authJWT, authorizeAdmin, getUser);

adminRouter.delete('/user/:id', authJWT, authorizeAdmin, deleteUser);

adminRouter.get('/user/:id/toAdmin', authJWT, authorizeAdmin, toAdmin);

adminRouter.get('/items', authJWT, authorizeAdmin, itemList);

adminRouter.delete('/item/:id', authJWT, authorizeAdmin, itemDelete);

export default adminRouter;
