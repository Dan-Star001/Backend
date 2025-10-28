const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
    try {        
        // ✅ GET TOKEN FROM HEADER
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required. No token provided.' 
            });
        }

        // ✅ EXTRACT TOKEN
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required. Token is empty.' 
            });
        }

        // ✅ VERIFY TOKEN
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        // ✅ GET USER FROM DATABASE
        const userId = decoded.userId || decoded._id || decoded.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token payload' 
            });
        }


        let user;
        try {
            user = await User.findById(userId).select('-password');
        } catch (dbError) {
            return res.status(500).json({ 
                success: false, 
                message: 'Database error during authentication',
                error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // ✅ ATTACH USER TO REQUEST
        req.user = user;
        
        next();

    } catch (error) {
        console.error('Message:', error.message);
        
        return res.status(500).json({ 
            success: false, 
            message: 'Authentication error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = authMiddleware;