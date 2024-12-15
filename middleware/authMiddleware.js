// Verify generated JWT
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import createError from 'http-errors';

dotenv.config();

const JWT_SECRET = process.env.JWT_KEY;

export const authJWT = (req, _, next) => {
  const token =
    req.cookies?.accessToken || req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return next(createError(401, 'Access denied. No token provided.'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    next(createError(401, error.message));
  }
};
