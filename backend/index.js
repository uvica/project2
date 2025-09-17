import express from 'express';
import path from 'path';

const app = express();

// Serve static files from the frontend directory
app.use(express.static(path.join(process.cwd(), 'frontend')));
// Serve images and files from uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.listen(5000, () => {
  console.log('Server running on port 5000');
});