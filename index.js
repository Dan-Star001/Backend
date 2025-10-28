const express = require('express');
const app = express();
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const userRoutes = require('./routes/user.route');
const chatRoutes = require('./routes/chat.route');
const authMiddleware = require('./middlewares/auth.middleware');
const postRoutes = require('./routes/post.route');
const notificationRoutes = require('./routes/notification.route');
const { setupSocket } = require('./sockets/socket');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Create HTTP server
const server = http.createServer(app);

const FIVE_MINUTES = 5 * 60 * 1000;
server.timeout = FIVE_MINUTES; 
server.headersTimeout = FIVE_MINUTES + 5000;

// Initialize Socket.io
const io = new Server(server);

// Setup Socket.io event handlers
setupSocket(io);

// Make io available to routes
app.set('io', io);

// Configure CORS
app.use(cors());

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ LOGGING MIDDLEWARE
app.use((req, res, next) => {
    // ...existing code...

    next();
});

// Connect to MongoDB
const URI = process.env.URI;
mongoose.connect(URI)
    .then(() => {
        // ...existing code...
    })
    .catch((err) => {
        // ...existing code...
    });

// ✅ MOUNT ROUTES WITH CORRECT PATHS
app.use('/api/users', userRoutes);           // User routes at /api/users/*
app.use('/user', userRoutes);                // Legacy route support at /user/*
app.use('/api/chat', authMiddleware, chatRoutes);  // Chat routes (auth required)
app.use('/api/posts', postRoutes);           // Post routes
app.use('/api/notifications', notificationRoutes);  // Notification routes

// ✅ CREATE UPLOADS FOLDER
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

// ✅ SERVE STATIC UPLOADS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ HEALTH CHECK ENDPOINT
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ✅ 404 HANDLER
app.use((req, res) => {
    // ...existing code...
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.method} ${req.path} not found` 
    });
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 1709;

server.listen(PORT, () => { 
    // ...existing code...
});

module.exports = app;