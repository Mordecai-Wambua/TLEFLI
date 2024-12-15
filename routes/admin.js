import express from 'express';
import { authJWT } from '../middleware/authMiddleware.js';
import uploadMiddleware from '../middleware/uploadMiddleware.js';
import { authorizeAdmin } from '../middleware/roleMiddleware.js';
import {
  userList,
  getUser,
  deleteUser,
  toAdmin,
  itemList,
  itemDelete,
  dashboard,
  profile,
  updateProfile,
} from '../controllers/adminController.js';

import { logout } from '../controllers/auth.js';

const adminRouter = express.Router();

adminRouter.get('/', authJWT, authorizeAdmin, dashboard);

adminRouter.get('/profile', authJWT, authorizeAdmin, profile);

adminRouter.put(
  '/profile',
  authJWT,
  authorizeAdmin,
  uploadMiddleware('profilePhoto'),
  updateProfile
);

adminRouter.post('/logout', authJWT, authorizeAdmin, logout);

adminRouter.get('/users', authJWT, authorizeAdmin, userList);

adminRouter.get('/user/:id', authJWT, authorizeAdmin, getUser);

adminRouter.delete('/user/:id', authJWT, authorizeAdmin, deleteUser);

adminRouter.get('/user/:id/toAdmin', authJWT, authorizeAdmin, toAdmin);

adminRouter.get('/items', authJWT, authorizeAdmin, itemList);

adminRouter.delete('/item/:id', authJWT, authorizeAdmin, itemDelete);

export default adminRouter;
