import express from 'express';
import {
    getPageContent,
    getAllContent,
    updateContent,
    updateContentByKey,
    bulkUpdateContent,
    seedDefaultContent,
    resetSectionToDefault,
    createContent,
    deleteContent,
} from '../controllers/websiteContentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── PUBLIC ROUTES (no auth required — consumed by the main website) ────────────
router.get('/public/:page', getPageContent);       // GET /api/website-content/public/landing
router.get('/public', getPageContent);              // GET /api/website-content/public (all pages)

// ─── ADMIN ROUTES (require auth) ────────────────────────────────────────────────
router.get('/', protect, getAllContent);                                      // GET  /api/website-content
router.post('/', protect, createContent);                                    // POST /api/website-content
router.put('/bulk', protect, bulkUpdateContent);                             // PUT  /api/website-content/bulk
router.post('/seed', protect, seedDefaultContent);                          // POST /api/website-content/seed
router.put('/reset/:page/:section', protect, resetSectionToDefault);        // PUT  /api/website-content/reset/:page/:section
router.put('/key/:key', protect, updateContentByKey);                       // PUT  /api/website-content/key/:key
router.put('/:id', protect, updateContent);                                  // PUT  /api/website-content/:id
router.delete('/:id', protect, deleteContent);                              // DELETE /api/website-content/:id

export default router;
