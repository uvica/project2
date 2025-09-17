// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage to upload to Cloudinary
export const createUploader = (folder) => {
  const storage = multer.memoryStorage();
  return multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
};

export { cloudinary };
