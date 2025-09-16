const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

// Routers
const coursesRouter = require('./routes/courses');
const usersRouter = require('./routes/users');
const faqsRouter = require('./routes/faqs');
const partnersRouter = require('./routes/partners');
const storiesRouter = require('./routes/success_stories');
const siteStatsRouter = require('./routes/siteStats');
const adminsRouter = require('./routes/admins');
const registrationsRouter = require('./routes/registrations');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173'
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Serve uploaded files (for local testing)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create folders if missing
['partners', 'success_stories', 'registrations'].forEach(folder => {
    const dir = path.join(__dirname, 'uploads', folder);
    if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
});

// Mount routers
app.use('/api/courses', coursesRouter);
app.use('/api/users', usersRouter);
app.use('/api/faqs', faqsRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/stories', storiesRouter);
app.use('', siteStatsRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/registrations', registrationsRouter);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));