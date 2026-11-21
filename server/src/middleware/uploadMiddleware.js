const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadRoot = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });
const upload = multer({
  dest: uploadRoot,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, /zip|compressed/.test(file.mimetype) || file.originalname.toLowerCase().endsWith('.zip'))
});
module.exports = { upload };
