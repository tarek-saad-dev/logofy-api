const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import database configuration
const { testConnection, initializeDatabase } = require('./config/database');

// Import localization middleware
const { localization } = require('./middleware/localization');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// IMPORTANT: Stripe webhook route MUST be registered BEFORE express.json()
// because Stripe needs the raw request body for signature verification
app.use('/api/stripe', require('./routes/stripeWebhook'));

// Now apply JSON parsing middleware for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// IMPORTANT: localization BEFORE routes
app.use(localization);

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to LOGO Maker API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/logos', require('./routes/logos'));
app.use('/api/logo', require('./routes/logo'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/layers', require('./routes/layers'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/icon-categories', require('./routes/iconCategories'));
app.use('/api/shape-categories', require('./routes/shapeCategories'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api', require('./routes/export'));
app.use('/api/migration', require('./routes/migration'));

// Billing routes
// HTML pages (success/cancel) are at /billing/* (no /api prefix)
app.use('/billing', require('./routes/billing'));
// API endpoints are at /api/billing/*
app.use('/api/billing', require('./routes/billing'));

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Initialize database and start server
const startServer = async() => {
    try {
        // Test database connection
        console.log('Testing database connection...');
        const isConnected = await testConnection();

        if (!isConnected) {
            console.error('❌ Cannot connect to database. Please check your DATABASE_URL in .env file');
            process.exit(1);
        }

        // Initialize database tables
        // Note: In production (Vercel), migrations should be run manually via /api/migration endpoints
        // or the migration will run on first request if needed
        console.log('Initializing database tables...');
        try {
            await initializeDatabase();
        } catch (error) {
            console.warn('⚠️  Database initialization had warnings (this is OK if tables already exist):', error.message);
            // Continue - migrations can be run manually if needed
        }

        // Start server (only if not in Vercel environment)
        if (process.env.NODE_ENV !== 'production') {
            app.listen(PORT, () => {
                console.log(`🚀 Server running on port ${PORT}`);
                console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
                console.log(`📊 Database: Connected`);
                console.log(`☁️  Cloudinary: Configured`);
            });
        }
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;