const Notification = require('../models/notification.model');

const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'userName fullName avatar')
            .populate('post', 'mediaUrl')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('💥 [NOTIFICATION] Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('💥 [NOTIFICATION] Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('💥 [NOTIFICATION] Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
