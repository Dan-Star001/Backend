const mongoose = require('mongoose');

let postSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    text: { type: String, required: false },
    
    // ✅ FIXED: MEDIA FIELDS - PROPER VALIDATION
    mediaUrl: { type: String, required: false },
    mediaType: { 
        type: String, 
        enum: ['image', 'video'], 
        required: false  // ✅ FIXED: NOT REQUIRED
    },
    
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
    bookmarks: [{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
    comments: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// ✅ BEFORE SAVE VALIDATION
postSchema.pre('save', function(next) {
    // If mediaUrl exists, mediaType MUST exist
    if (this.mediaUrl && !this.mediaType) {
        return next(new Error('mediaType is required when mediaUrl exists'));
    }
    // If mediaType exists, mediaUrl MUST exist  
    if (this.mediaType && !this.mediaUrl) {
        return next(new Error('mediaUrl is required when mediaType exists'));
    }
    next();
});

module.exports = mongoose.model('post', postSchema);