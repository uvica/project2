// cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const createUploader = (folder) => {
  const explicitlyEnabled = String(process.env.CLOUDINARY_ENABLED || '').toLowerCase() === 'true';
  const hasCloudinaryCreds = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const useCloudinary = explicitlyEnabled && hasCloudinaryCreds;

  console.log('Cloudinary configuration:', {
    enabled: explicitlyEnabled,
    hasCredentials: hasCloudinaryCreds,
    useCloudinary,
    folder
  });

  if (useCloudinary) {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ quality: 'auto' }],
        format: 'webp',
        resource_type: 'auto'
      }
    });

    return multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 }
    });
  }

  // Local storage fallback
  const uploadsDir = path.resolve('uploads', folder);
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadsDir),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname) || '.webp';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    }
  });
  return multer({ storage });
};

export { cloudinary };

