const Post = require('../models/post.model');
const userModel = require('../models/user.model');
const Notification = require('../models/notification.model');
const mongoose = require('mongoose');

const createPost = async (req, res) => {
    try {

        const { text } = req.body;
        const mediaFile = req.file;

        // ✅ VALIDATION: At least text OR media required
        if (!text?.trim() && !mediaFile) {
            return res.status(400).json({ 
                success: false, 
                message: 'Post must have text or media' 
            });
        }

        // ✅ BUILD POST DATA
        const postData = {
            userId: req.user._id,
            text: text?.trim() || ''
        };

        // ✅ CLOUDINARY FILE HANDLING
        if (mediaFile) {
            // Cloudinary stores the file URL in req.file.path
            postData.mediaUrl = mediaFile.path;
            
            // Determine media type from mimetype or resource_type
            if (mediaFile.mimetype) {
                postData.mediaType = mediaFile.mimetype.startsWith('image/') ? 'image' : 'video';
            } else if (mediaFile.resource_type) {
                postData.mediaType = mediaFile.resource_type === 'video' ? 'video' : 'image';
            } else {
                postData.mediaType = 'image'; // Default fallback
            }
            
        }


        // ✅ CREATE AND SAVE POST
        const post = new Post(postData);
        await post.save();
        
        // ✅ POPULATE USER DATA
        await post.populate('userId', 'userName fullName avatar');
        
        
        res.status(201).json({ 
            success: true, 
            post: post.toObject() 
        });

    } catch (error) {
        
        // Handle specific errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                message: 'File size limit exceeded (10MB max)' 
            });
        }
        
        if (error.name === 'TimeoutError' || error.http_code === 499) {
            return res.status(408).json({ 
                success: false, 
                message: 'Upload timeout. Please try with a smaller file or check your internet connection.' 
            });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }

        if (error.http_code === 401) {
            return res.status(500).json({ 
                success: false, 
                message: 'Cloudinary authentication failed. Please contact support.' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create post. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// ✅ GET FEED - Convert ObjectIds to strings for frontend comparison
const getFeed = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'userName fullName avatar')
            .populate({
                path: 'comments.userId',
                select: 'userName fullName avatar'
            })
            .lean();

        // Convert likes and bookmarks ObjectIds to strings
        const processedPosts = posts.map(post => ({
            ...post,
            likes: post.likes.map(id => id.toString()),
            bookmarks: post.bookmarks.map(id => id.toString())
        }));

        res.json({ success: true, posts: processedPosts });
    } catch (error) {
        console.error('💥 [POST] Feed error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;

        const posts = await Post.find({ userId })
            .sort({ createdAt: -1 })
            .populate('userId', 'userName fullName avatar')
            .populate({
                path: 'comments.userId',
                select: 'userName fullName avatar'
            })
            .lean();

        // Convert likes and bookmarks ObjectIds to strings
        const processedPosts = posts.map(post => ({
            ...post,
            likes: post.likes.map(id => id.toString()),
            bookmarks: post.bookmarks.map(id => id.toString())
        }));

        res.json({ success: true, posts: processedPosts });
    } catch (error) {
        console.error('💥 [POST] User posts error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Toggle like
        const isLiked = post.likes.includes(userId);
        if (isLiked) {
            post.likes = post.likes.filter(id => id.toString() !== userId.toString());
        } else {
            post.likes.push(userId);

            // Create notification (only if not liking own post)
            if (post.userId.toString() !== userId.toString()) {
                const notification = new Notification({
                    recipient: post.userId,
                    sender: userId,
                    type: 'like',
                    message: 'liked your post',
                    post: postId
                });
                await notification.save();

                // Emit real-time notification
                const io = req.app.get('io');
                if (io) {
                    io.to(`notifications_${post.userId}`).emit('new_notification', {
                        notification: await notification.populate('sender', 'userName fullName avatar')
                    });
                }
            }
        }

        await post.save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`post_${postId}`).emit('post_like_update', {
                postId,
                likes: post.likes,
                action: isLiked ? 'unlike' : 'like',
                userId
            });
        }

        res.json({ success: true, likes: post.likes.map(id => id.toString()) });
    } catch (error) {
        console.error('💥 [POST] Like error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const toggleBookmark = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Toggle bookmark
        const isBookmarked = post.bookmarks.includes(userId);
        if (isBookmarked) {
            post.bookmarks = post.bookmarks.filter(id => id.toString() !== userId.toString());
        } else {
            post.bookmarks.push(userId);
        }

        await post.save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`post_${postId}`).emit('post_bookmark_update', {
                postId,
                bookmarks: post.bookmarks,
                action: isBookmarked ? 'unbookmark' : 'bookmark',
                userId
            });
        }

        res.json({ 
            success: true, 
            isBookmarked: !isBookmarked, 
            bookmarks: post.bookmarks.map(id => id.toString()) 
        });
    } catch (error) {
        console.error('💥 [POST] Bookmark error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        if (!text?.trim()) {
            return res.status(400).json({ success: false, message: 'Comment required' });
        }

        // Add comment
        post.comments.push({
            userId,
            text: text.trim()
        });

        await post.save();

        // Create notification (only if not commenting on own post)
        if (post.userId.toString() !== userId.toString()) {
            const notification = new Notification({
                recipient: post.userId,
                sender: userId,
                type: 'comment',
                message: 'commented on your post',
                post: postId
            });
            await notification.save();

            // Emit real-time notification
            const io = req.app.get('io');
            if (io) {
                io.to(`notifications_${post.userId}`).emit('new_notification', {
                    notification: await notification.populate('sender', 'userName fullName avatar')
                });
            }
        }

        // Populate user data for the new comment
        await post.populate('comments.userId', 'userName fullName avatar');
        const populatedComment = post.comments[post.comments.length - 1];

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`post_${postId}`).emit('post_comment_update', {
                postId,
                comment: populatedComment,
                action: 'add',
                userId
            });
        }

        res.status(201).json({ success: true, comment: populatedComment });
    } catch (error) {
        console.error('💥 [POST] Comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { createPost, getFeed, getUserPosts, toggleLike, toggleBookmark, addComment };