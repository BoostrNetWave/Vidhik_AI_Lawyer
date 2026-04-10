import express, { Router } from 'express';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import { getBlogs, createBlog, deleteBlog, togglePublish, getBlogById, updateBlog } from '../controllers/blogController.js';
import { protect } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

const storage: StorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `blog-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images (jpg, png, webp, gif) are allowed'));
        }
    }
});

router.use(protect);

router.get('/', getBlogs);
router.get('/:id', getBlogById);
router.post('/', upload.single('image'), createBlog);
router.put('/:id', upload.single('image'), updateBlog);
router.delete('/:id', deleteBlog);
router.post('/:id/toggle', togglePublish);

export default router;
