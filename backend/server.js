const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
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
app.use(cors({
    origin: true, // Allow all origins
    credentials: true
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test uploads folders exist
['partners', 'success_stories'].forEach(folder => {
    const dir = path.join(__dirname, 'uploads', folder);
    if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
});

// Mount routers
app.use('/api/courses', coursesRouter);
app.use('/api/users', usersRouter);
app.use('/api/faqs', faqsRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/site_stats', siteStatsRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/registrations', registrationsRouter);

// Temporary test endpoints
app.get('/test-partners', (req, res) => res.json({ message: 'Partners route works!' }));
app.get('/test-stories', (req, res) => res.json({ message: 'Stories route works!' }));

// Debug routes
app.get('/api/debug', async (req, res) => {
    try {
        await db.execute('SELECT 1 as test');
        res.json({ status: 'OK', database: 'Connected', timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ status: 'Error', database: 'Connection failed', error: err.message });
    }
});

app.get('/api/debug/uploads', (req, res) => {
    const fs = require('fs');
    const uploadsPath = path.join(__dirname, 'uploads');
    try {
        const partners = fs.readdirSync(path.join(uploadsPath, 'partners'));
        const stories = fs.readdirSync(path.join(uploadsPath, 'success_stories'));
        res.json({ uploadsDir: uploadsPath, partners, stories });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
