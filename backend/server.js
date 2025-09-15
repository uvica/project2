const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');
const partnersRouter = require('./routes/partners'); // Adjust path as needed

const app = express();

// Configure multer storage (optional, can be moved to partners.js if needed)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads/partners'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Unique filename
    }
});
const upload = multer({ storage });

// Middleware
app.use(express.json()); // For JSON requests
app.use(express.urlencoded({ extended: true })); // For form data parsing
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:8000'
    ],
    credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Mount routers
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/partners', partnersRouter); // Mount partners router
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