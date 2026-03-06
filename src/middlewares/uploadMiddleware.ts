import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: 'longlife_profiles',
            allowed_formats: ['jpg', 'png', 'jpeg'],
            transformation: [{ width: 400, height: 400, crop: 'limit' }],
        };
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
    }
});

export default upload;
