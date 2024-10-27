import multer from 'multer';
import configureMulter from '../utils/upload.js';

export default function uploadMiddleware(fieldName) {
  return (req, res, next) => {
    const upload = configureMulter(fieldName);
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res
            .status(400)
            .json({ message: 'File size exceeds the 5MB limit' });
        }
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
}
