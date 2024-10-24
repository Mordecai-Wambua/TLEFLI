// Defines routes for user related operations
import express from 'express';
import { profile, updateProfile } from '../controllers/userController.js';
import { authJWT } from '../middleware/authMiddleware.js';
import { authorizeUser } from '../middleware/roleMiddleware.js';
import upload from '../utils/upload.js';
import {
  reportLostItem,
  getLostItems,
  updateLostItem,
} from '../controllers/itemController.js';

const userRouter = express.Router();

userRouter.get('/profile', authJWT, authorizeUser, profile);

userRouter.put(
  '/profile',
  authJWT,
  authorizeUser,
  upload.single('profilePhoto'),
  updateProfile
);

userRouter.get('/', express.json(), authJWT, authorizeUser, (req, res) => {
  return res.status(200).json({ message: 'User Dashboard' });
});

userRouter.get('/lost-item', authJWT, authorizeUser, getLostItems);

userRouter.post(
  '/lost-item',
  authJWT,
  authorizeUser,
  upload.single('itemImage'),
  reportLostItem
);

userRouter.put(
  '/lost-item/:id',
  authJWT,
  authorizeUser,
  upload.single('itemImage'),
  updateLostItem
);

export default userRouter;
