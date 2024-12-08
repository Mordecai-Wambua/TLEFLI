import multer from 'multer';
import configureMulter from '../utils/upload.js';
import { ApiError } from '../utils/ApiError.js';

export default function uploadMiddleware(fieldName) {
  return (req, res, next) => {
    const upload = configureMulter(fieldName);
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size exceeds the 5MB limit'));
        }
      } else if (err) {
        return next(new ApiError(400, err.message));
      }
      next();
    });
  };
}
