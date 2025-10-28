const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // ID of conversation this message belongs to
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    // ID of sender
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    //  Message content (text)
    content: { type: String, required: true, trim: true },
    // Message type (text, image, etc.)
    type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    // Array of read receipts (userId -> readAt)
    readBy: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, readAt: { type: Date, default: Date.now } }]
}, {
    // Timestamps automatically added
    timestamps: true
});

// Index for fast conversation lookups
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);