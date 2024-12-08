// MIddleware for Role Based Authentication

import { ApiError } from '../utils/ApiError.js';

export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Access denied. Admins only.'));
  }
  next();
};

export const authorizeUser = (req, res, next) => {
  if (req.user.role !== 'user') {
    return next(new ApiError(403, 'Access denied. Registered users only.'));
  }
  next();
};
