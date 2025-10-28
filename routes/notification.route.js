const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notification.controller');

router.get('/', authMiddleware, getNotifications);
router.put('/:notificationId/read', authMiddleware, markAsRead);
router.put('/read-all', authMiddleware, markAllAsRead);

module.exports = router;
