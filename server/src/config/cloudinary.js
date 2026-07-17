import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const uploadFileToCloud = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    if (isCloudinaryConfigured()) {
      // Upload to Cloudinary
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'auto',
      });
      // Remove local temp file
      fs.unlinkSync(localFilePath);
      return {
        url: response.secure_url,
        type: response.resource_type === 'image' ? 'image' : 'file',
      };
    } else {
      // Fallback: File is already stored in public/uploads/ by multer.
      // Return a relative path or absolute local path.
      // We will parse the file name and return it.
      const filename = path.basename(localFilePath);
      const url = `http://localhost:${process.env.PORT || 5000}/uploads/${filename}`;
      // Determine file type based on extension
      const ext = path.extname(filename).toLowerCase();
      const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);
      return {
        url,
        type: isImage ? 'image' : 'file',
      };
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    // Cleanup local file if it exists and we tried to upload to cloud
    if (isCloudinaryConfigured() && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw error;
  }
};
