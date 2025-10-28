const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const userModel = require('../models/user.model');

const getConversations = async (req, res) => {
    try {
        
        // Find conversations where user is a participant
        const conversations = await Conversation.find({
            participants: req.user._id
        })
        .populate('participants', 'userName fullName avatar')
        .populate('lastMessage')
        .sort({ updatedAt: -1 })
        .lean();


        // Get unread counts for current user
        const unreadCounts = {};
        conversations.forEach(conv => {
            const count = conv.unreadCount?.[req.user._id.toString()] || 0;
            unreadCounts[conv._id] = count;
        });

        res.json({
            success: true,
            conversations,
            unreadCounts
        });
    } catch (error) {
        console.error('💥 [CHAT] Get conversations error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const page = parseInt(req.query.page ?? 1);
        const limit = 50;
        const skip = (page - 1) * limit;

        ;

        // 1. Authorization check
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        }).exec();

        if (!conversation) {
            return res.status(404).json({ 
                success: false, 
                message: 'Conversation not found' 
            });
        }

        // 2. Get messages with pagination
        const messages = await Message.find({ conversationId })
            .populate('sender', 'userName fullName avatar')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean()
            .exec();


        // 3. Mark messages as read (in background)
        Message.updateMany(
            { 
                conversationId, 
                'sender': { $ne: req.user._id },
                'readBy.userId': { $ne: req.user._id } 
            }, 
            { $addToSet: { readBy: { userId: req.user._id, readAt: new Date() } } }
        ).exec().catch(err => console.error('Error marking as read:', err));

        // 4. Reset unread count
        Conversation.findByIdAndUpdate(
            conversationId, 
            { [`unreadCount.${req.user._id}`]: 0 }
        ).exec().catch(err => console.error('Error resetting unread:', err));

        res.json({
            success: true,
            messages: messages.reverse(), // Oldest first
            hasMore: messages.length === limit
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const createConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        const currentUserId = req.user._id;


        // 1. Validation
        if (!participantId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Participant ID required' 
            });
        }

        const participant = await userModel.findById(participantId);
        if (!participant) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        if (participantId.toString() === currentUserId.toString()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot start a conversation with yourself' 
            });
        }

        // 2. Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, participantId] }
        }).exec();

        if (!conversation) {
            // 3. Create new conversation
            conversation = new Conversation({
                participants: [currentUserId, participantId],
                unreadCount: {
                    [currentUserId.toString()]: 0,
                    [participantId.toString()]: 0
                }
            });
            await conversation.save();
            console.log('✅ [CHAT] New conversation created:', conversation._id);
        } else {
            console.log('✅ [CHAT] Existing conversation found:', conversation._id);
        }

        // 4. Populate and return
        await conversation.populate('participants', 'userName fullName avatar');

        res.json({ 
            success: true, 
            conversation 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { getConversations, getMessages, createConversation };