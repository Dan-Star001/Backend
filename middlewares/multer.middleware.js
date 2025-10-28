const { upload } = require('../config/cloudinary');

// Export the configured multer middleware with Cloudinary storage
module.exports = upload.single('media');