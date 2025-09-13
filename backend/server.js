const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');

const app = express();

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:8000' // Add your frontend port
    ],
    credentials: true
}));

// JSON parsing
app.use(express.json());

// Serve uploaded CVs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/stories', require('./routes/success_stories'));
app.use('/api/site_stats', require('./routes/siteStats'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/registrations', require('./routes/registrations'));

// Catch-all for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
