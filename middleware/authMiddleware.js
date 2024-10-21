// Verify generated JWT
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_KEY;

export const authJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Assuming the token is sent as 'Bearer <token>'

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Checks  the role and adds it to req.user
    if (decoded.role === 'admin') {
      req.user.isAdmin = true;
    } else if (decoded.role === 'user') {
      req.user.isUser = true;
    }
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};
