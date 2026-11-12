import path from 'path';
import { RequestHandler } from 'express';
import multer, { StorageEngine } from 'multer';
import { v4 } from 'uuid';
import fs from 'fs';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary, { cloudinaryEnabled } from './cloudinary';

/** Local disk storage — used as a dev fallback when Cloudinary isn't configured. */
function getDiskStorage(address: string): StorageEngine {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            const dir = `./uploads/${address}`;
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            const extension = path.parse(file.originalname).ext;
            cb(null, v4() + extension);
        },
    });
}

/** Cloudinary storage — `file.path` resolves to the hosted https URL. */
function getCloudinaryStorage(address: string): StorageEngine {
    return new CloudinaryStorage({
        cloudinary,
        params: {
            folder: `auction/${address}`,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            public_id: () => v4(),
        } as Record<string, unknown>,
    });
}

const makeUploader = (address: string) => {
    const storage = cloudinaryEnabled
        ? getCloudinaryStorage(address)
        : getDiskStorage(address);
    return multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    });
};

/**
 * Wraps an upload middleware so failures (Cloudinary signature errors,
 * file-size limits, disallowed formats) render a friendly alert on the
 * admin (HTML) pages instead of leaking Express's raw JSON error response.
 */
export const handleUpload =
    (mw: RequestHandler): RequestHandler =>
    (req, res, next) =>
        mw(req, res, (err: unknown) => {
            if (err) {
                const message =
                    err instanceof Error ? err.message : 'Image upload failed';
                return res.send(
                    `<script>alert(${JSON.stringify(message)}); history.back();</script>`
                );
            }
            next();
        });

export default makeUploader;
