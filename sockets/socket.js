const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const Notification = require('../models/notification.model');
const jwt = require('jsonwebtoken');

// Socket.io setup function
const setupSocket = (io) => {
    // Middleware to authenticate socket connections
    io.use((socket, next) => {
        // Extract token from auth query parameter
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        // LINE 6: Verify JWT token (jwt.verify is typically synchronous unless wrapped in a Promise)
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // LINE 7: Attach user ID to socket
        socket.userId = decoded.userId;
        next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    // LINE 8: Handle socket connection
    io.on('connection', (socket) => {

        // LINE 9: Join user's conversation rooms
        socket.join(socket.userId);

        // LINE 10: Handle join conversation event
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
        });

        // Handle join post room for real-time post updates
        socket.on('join_post', (postId) => {
            socket.join(`post_${postId}`);
        });

        // Handle leave post room
        socket.on('leave_post', (postId) => {
            socket.leave(`post_${postId}`);
        });

        // LINE 11: Handle send message event
        socket.on('send_message', (data) => {
            // LINE 12: Create new message
            const message = new Message({
                conversationId: data.conversationId,
                sender: socket.userId,
                content: data.content,
                type: data.type || 'text'
            });

            // LINE 13: Save message to database
            message.save()
    .then(savedMessage => {
        // LINE 14: Update conversation lastMessage (Keep this)
        return Conversation.findByIdAndUpdate(
            data.conversationId,
            { lastMessage: savedMessage._id }
        )
        .then(() => savedMessage); // Pass savedMessage to next .then
    })
    .then(async (savedMessage) => { // ⬅️ Change to async to use await
        
        // 🔑 CRITICAL FIX: Find the message and populate the sender using the correct field 'userName'
        const populatedMessage = await Message.findById(savedMessage._id)
            .populate('sender', 'userName fullName avatar'); // Use 'userName'

        // LINE 15: Emit message to conversation room
        io.to(data.conversationId).emit('new_message', populatedMessage); // Emit the fully populated object

        // LINE 16: Fetch conversation to get participants
        return Conversation.findById(data.conversationId)
            .populate('participants')
            .then(conversation => {
                            // Increment unread count for other participants
                            conversation.participants.forEach(participant => {
                                if (participant._id.toString() !== socket.userId) {
                                    // LINE 17: Emit unread notification to recipient
                                    io.to(participant._id.toString()).emit('unread_message', {
                                        conversationId: data.conversationId,
                                        messageId: savedMessage._id
                                    });
                                }
                            });
                        });
                })
                .catch(error => {
                    socket.emit('error', { message: 'Failed to send message' });
                });
        });

        // LINE 18: Handle message read event
        socket.on('message_read', (data) => {
            // LINE 19: Mark message as read by user
            Message.findByIdAndUpdate(data.messageId, {
                $addToSet: { readBy: { userId: socket.userId } }
            })
            // LINE 20: Update unread count in conversation
            .then(() => {
                return Conversation.findByIdAndUpdate(data.conversationId, {
                    $inc: { [`unreadCount.${socket.userId}`]: -1 }
                });
            })
            .then(() => {
                // LINE 21: Notify sender that message was read
                socket.to(data.conversationId).emit('message_read', {
                    messageId: data.messageId,
                    userId: socket.userId
                });
            })
            .catch(error => {
            });
        });

        // Handle real-time notifications
        socket.on('join_notifications', () => {
            socket.join(`notifications_${socket.userId}`);
        });

        // LINE 22: Handle disconnect
        socket.on('disconnect', () => {
        });
    });
};

module.exports = { setupSocket };