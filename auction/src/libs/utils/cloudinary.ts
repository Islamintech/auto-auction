import { v2 as cloudinary } from 'cloudinary';

/**
 * Configures Cloudinary from environment.
 * Supports either a single CLOUDINARY_URL (cloudinary://key:secret@cloud)
 * or the three discrete vars. `cloudinaryEnabled` is false when no
 * credentials are present, so the app can fall back to local disk storage
 * during development.
 */
if (process.env.CLOUDINARY_URL) {
    // The SDK auto-parses CLOUDINARY_URL; just enforce https.
    cloudinary.config({ secure: true });
} else if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}

export const cloudinaryEnabled = Boolean(
    process.env.CLOUDINARY_URL ||
        (process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET)
);

export default cloudinary;
