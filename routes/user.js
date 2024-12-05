// Defines routes for user related operations
import express from 'express';
import { profile, updateProfile } from '../controllers/userController.js';
import { authJWT } from '../middleware/authMiddleware.js';
import { authorizeUser } from '../middleware/roleMiddleware.js';
import uploadMiddleware from '../middleware/uploadMiddleware.js';
import {
  reportItem,
  getItems,
  getItem,
  updateItem,
  deleteItem,
  matchItem,
  verifyMatchQuestion,
  verifyMatchAnswer,
} from '../controllers/itemController.js';

const userRouter = express.Router();

userRouter.get('/profile', authJWT, authorizeUser, profile);

userRouter.put(
  '/profile',
  authJWT,
  authorizeUser,
  uploadMiddleware('profilePhoto'),
  updateProfile
);

userRouter.get('/', express.json(), authJWT, authorizeUser, (req, res) => {
  return res.status(200).json({ message: 'User Dashboard' });
});

userRouter.get('/items', authJWT, authorizeUser, getItems);

userRouter.get('/item/:id', authJWT, authorizeUser, getItem);

userRouter.post(
  '/item',
  authJWT,
  authorizeUser,
  uploadMiddleware('itemImage'),
  reportItem
);

userRouter.put(
  '/item/:id',
  authJWT,
  authorizeUser,
  uploadMiddleware('itemImage'),
  updateItem
);

userRouter.delete('/item/:id', authJWT, authorizeUser, deleteItem);

userRouter.get('/item/:id/matches', authJWT, authorizeUser, matchItem);

userRouter.get('/item/:id/matches/:mid', authJWT, authorizeUser, verifyMatchQuestion);

userRouter.post('/item/:id/matches/:mid',express.json(), authJWT, authorizeUser, verifyMatchAnswer);

export default userRouter;
