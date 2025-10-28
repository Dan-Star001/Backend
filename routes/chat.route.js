// chat.route.js

const express = require('express');       
const router = express.Router();         
const { getConversations, getMessages, createConversation} = require('../controllers/chat.controller');
// FIX: Import the middleware
const authMiddleware = require('../middlewares/auth.middleware'); 

// LINE 4: GET /api/chat/conversations - Get all conversations
// FIX: Apply authMiddleware
router.get('/conversations', authMiddleware, getConversations); 

// LINE 5: GET /api/chat/conversations/:conversationId/messages - Get messages
// FIX: Apply authMiddleware
router.get('/conversations/:conversationId/messages', authMiddleware, getMessages); 

// LINE 6: POST /api/chat/conversations - Create new conversation
// FIX: Apply authMiddleware
router.post('/conversations', authMiddleware, createConversation); 

module.exports = router;               

