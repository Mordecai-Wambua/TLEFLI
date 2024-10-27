import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

function checkFileType(file, cb) {
  // Allowed file extensions
  const filetypes = /jpeg|jpg|png|gif|bmp|webp|tiff/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true); // Accept the file
  } else {
    return cb(new Error('Invalid file type. Only image files are allowed!'));
  }
}

const configureMulter = (fieldName) =>
  multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
      checkFileType(file, cb);
    },
  }).single(fieldName);

export default configureMulter;
