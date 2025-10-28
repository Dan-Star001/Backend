const mongoose = require('mongoose');    

const conversationSchema = new mongoose.Schema({
    // Array of participant user IDs
    participants: [{type: mongoose.Schema.Types.ObjectId,ref: 'user',required: true}],
    // Array of message IDs in this conversation
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    // Last message in conversation (for sorting)
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    // Unread message count for each participant
    unreadCount: { type: Map, of: Number, default: {} }}, { timestamps: true });

// Index for fast participant lookups
conversationSchema.index({ participants: 1 });

// Export Conversation model
module.exports = mongoose.model('Conversation', conversationSchema);