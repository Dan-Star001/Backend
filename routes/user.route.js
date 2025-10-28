const express = require('express');
const { 
    postSignup, 
    postSignin, 
    getHomepage, 
    getSuggestedUsers, 
    searchUsers, 
    followUser, 
    unfollowUser, 
    getUserById,
    updateUserProfile
} = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const router = express.Router();

// ✅ PUBLIC ROUTES (No auth required)
router.post('/signup', postSignup);
router.post('/signin', postSignin);
router.get('/homepage', getHomepage);

// ✅ PROTECTED ROUTES (Auth required)
router.get('/suggested', authMiddleware, getSuggestedUsers);
router.get('/search', authMiddleware, searchUsers);
router.post('/:id/follow', authMiddleware, followUser);
router.post('/:id/unfollow', authMiddleware, unfollowUser);
router.get('/:id', authMiddleware, getUserById);
router.put('/profile', authMiddleware, updateUserProfile);

module.exports = router;