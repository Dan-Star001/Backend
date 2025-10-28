const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();


// ✅ VALIDATE ENV VARIABLES
if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not configured');
}

// ✅ CONFIGURE CLOUDINARY WITH TIMEOUT
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 300000 // 60 second timeout
});


// ✅ SETUP STORAGE WITH OPTIMIZED SETTINGS
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        try {

            const isVideo = file.mimetype.startsWith('video/');
            
            // ✅ OPTIMIZED UPLOAD SETTINGS
            const params = {
                folder: 'communio',
                resource_type: isVideo ? 'video' : 'image',
                allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm'],
                public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
                // ✅ OPTIMIZE FOR FASTER UPLOAD
                quality: 'auto:low', // Auto quality, lower for faster upload
                fetch_format: 'auto'
            };

            // ✅ ADDITIONAL OPTIMIZATIONS FOR IMAGES
            if (!isVideo) {
                params.transformation = [
                    { width: 1080, height: 1080, crop: 'limit' }, // Max 1080x1080
                    { quality: 'auto:low' }
                ];
            }

            return params;

        } catch (error) {
            throw error;
        }
    }
});

// ✅ FILE FILTER
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
    // ...existing code...
        cb(null, true);
    } else {
    // ...existing code...
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: images (jpg, png, gif, webp) and videos (mp4, webm)`), false);
    }
};

// ✅ MULTER WITH REDUCED FILE SIZE FOR FASTER UPLOADS
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB limit (faster uploads)
    }
});


// ✅ ERROR HANDLING FOR CLOUDINARY
process.on('unhandledRejection', (error) => {
    if (error.name === 'TimeoutError') {
    }
});

module.exports = { cloudinary, upload };