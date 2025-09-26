const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Shared configuration for image uploads (JPEG only, up to 5MB)
const MAX_IMAGE_SIZE = 200 * 1024 * 1024; // 5 MB
const storage = multer.memoryStorage();

const uploadSingleImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/pjpeg';
    return ok ? cb(null, true) : cb(new Error('INVALID_FILE_TYPE'));
  },
}).single('imagen');

// Directories for storing images and masks
const IMGS_DIR = path.resolve(__dirname, '../../categorizador/predicts/imgs');
const MASKS_DIR = path.resolve(__dirname, '../../categorizador/predicts/masks');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function isJpegMime(mimetype = '') {
  return (
    mimetype === 'image/jpeg' ||
    mimetype === 'image/jpg' ||
    mimetype === 'image/pjpeg' ||
    mimetype.startsWith('image/jpeg')
  );
}

function respondMulterError(err, res) {
  if (!err) return false;
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      message: 'La imagen excede el tamaño máximo permitido (5MB).',
    });
    return true;
  }
  if (err.message === 'INVALID_FILE_TYPE') {
    res.status(400).json({ message: 'Solo se aceptan imágenes JPG.' });
    return true;
  }
  res.status(400).json({ message: 'Error al subir la imagen.', err });
  return true;
}

module.exports = {
  MAX_IMAGE_SIZE,
  uploadSingleImage,
  IMGS_DIR,
  MASKS_DIR,
  ensureDirExists,
  isJpegMime,
  respondMulterError,
};

