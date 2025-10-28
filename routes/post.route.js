const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/multer.middleware');
const { createPost, getFeed, getUserPosts, toggleLike, toggleBookmark, addComment } = require('../controllers/post.controller');

router.post('/', authMiddleware, upload, createPost);  // ✅ 'media' field
router.get('/feed', authMiddleware, getFeed);
router.get('/user/:userId', authMiddleware, getUserPosts);
router.post('/:postId/like', authMiddleware, toggleLike);
router.post('/:postId/bookmark', authMiddleware, toggleBookmark);
router.post('/:postId/comment', authMiddleware, addComment);

module.exports = router;    