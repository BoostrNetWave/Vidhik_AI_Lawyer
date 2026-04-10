import { Response } from 'express';
import Blog from '../models/Blog.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getBlogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const userId = req.user?.userId;
        const query = userId ? { authorId: userId } : {};

        const total = await Blog.countDocuments(query);
        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: blogs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBlogById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            res.status(404).json({ message: 'Blog not found' });
            return;
        }
        res.json(blog);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBlog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const blogData = { ...req.body };
        const userId = req.user.userId;

        // Force the authorId from the authenticated user session
        blogData.authorId = userId;

        // Handle specific fields from FormData
        if (blogData.premium === 'true') blogData.premium = true;
        if (blogData.premium === 'false') blogData.premium = false;

        // Handle image file if uploaded
        if (req.file) {
            blogData.image = `/uploads/${req.file.filename}`;
        }

        const blog = new Blog(blogData);
        const newBlog = await blog.save();
        res.status(201).json(newBlog);
    } catch (error: any) {
        console.error('Create blog error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const updateBlog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const blogData = { ...req.body };
        const userId = req.user.userId;

        // Handle specific fields from FormData
        if (blogData.premium === 'true') blogData.premium = true;
        if (blogData.premium === 'false') blogData.premium = false;

        // Handle image file if uploaded
        if (req.file) {
            blogData.image = `/uploads/${req.file.filename}`;
        }

        // Ensure ownership
        const blog = await Blog.findOneAndUpdate(
            { _id: req.params.id, authorId: userId },
            blogData,
            { new: true }
        );

        if (!blog) {
            res.status(404).json({ message: 'Blog not found or unauthorized' });
            return;
        }
        res.json(blog);
    } catch (error: any) {
        console.error('Update blog error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const deleteBlog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;
        const blog = await Blog.findOneAndDelete({ _id: req.params.id, authorId: userId });
        if (!blog) {
            res.status(404).json({ message: 'Blog not found or unauthorized' });
            return;
        }
        res.json({ message: 'Blog deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const togglePublish = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.userId;
        const { publisherName } = req.body;
        const blog = await Blog.findOne({ _id: req.params.id, authorId: userId });
        
        if (!blog) {
            res.status(404).json({ message: 'Blog not found or unauthorized' });
            return;
        }

        // Toggle logic
        if (blog.status === 'Draft') {
            blog.status = 'Published';
            if (publisherName) {
                blog.author = publisherName;
            }
        } else {
            blog.status = 'Draft';
        }

        await blog.save();
        res.json(blog);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
