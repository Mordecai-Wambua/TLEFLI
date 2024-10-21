// Defines routes for user related operations
import express from 'express';
import multer from 'multer';
import { profile, updateProfile } from '../controllers/userController.js';
import { authJWT } from '../middleware/authMiddleware.js';
import { authorizeUser } from '../middleware/roleMiddleware.js';

const userRouter = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

export default userRouter;
