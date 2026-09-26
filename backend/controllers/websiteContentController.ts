import { Request, Response } from 'express';
import WebsiteContent from '../models/WebsiteContent.js';

// Default content seed — mirrors current hardcoded content from the landing page
const DEFAULT_CONTENT = [
    // ─── HERO ───────────────────────────────────────────────────────────────────
    { section: 'hero', page: 'landing', key: 'hero.badge_text', contentType: 'text', value: 'Get started with Vidhik AI', label: 'Badge Text', order: 1 },
    { section: 'hero', page: 'landing', key: 'hero.headline', contentType: 'text', value: 'Legal work, drafted with intelligence.', label: 'Headline', order: 2 },
    { section: 'hero', page: 'landing', key: 'hero.subheadline', contentType: 'text', value: 'Generate professional legal documents, review contracts, and move from legal questions to usable work — faster.', label: 'Subheadline', order: 3 },
    { section: 'hero', page: 'landing', key: 'hero.cta_primary_text', contentType: 'text', value: 'Start Free Trial', label: 'Primary CTA Button Text', order: 4 },
    { section: 'hero', page: 'landing', key: 'hero.cta_secondary_text', contentType: 'text', value: 'Watch Demo', label: 'Secondary CTA Button Text', order: 5 },
    { section: 'hero', page: 'landing', key: 'hero.trust_text', contentType: 'text', value: 'Trusted by legal professionals', label: 'Trust Badge Text', order: 6 },
    { section: 'hero', page: 'landing', key: 'hero.dashboard_image_url', contentType: 'url', value: '', label: 'Dashboard Preview Image URL', description: 'URL to the hero dashboard screenshot. Leave empty to use default local image.', order: 7 },

    // ─── WORKFLOW ────────────────────────────────────────────────────────────────
    { section: 'workflow', page: 'landing', key: 'workflow.section_tag', contentType: 'text', value: 'Workflow', label: 'Section Tag Label', order: 1 },
    { section: 'workflow', page: 'landing', key: 'workflow.headline', contentType: 'text', value: 'From blank page to executed agreement in minutes.', label: 'Headline', order: 2 },
    { section: 'workflow', page: 'landing', key: 'workflow.subheadline', contentType: 'text', value: 'Our intelligent workflow removes the friction from legal documentation, letting you focus on your actual business.', label: 'Subheadline', order: 3 },
    {
        section: 'workflow', page: 'landing', key: 'workflow.steps', contentType: 'json', order: 4,
        label: 'Steps (JSON Array)',
        description: 'Array of { num, title, desc }',
        value: [
            { num: '01', title: 'Choose a document', desc: 'Select the legal document you need from our verified template library.' },
            { num: '02', title: 'Provide your details', desc: 'Answer a few simple questions in plain English to customize your document.' },
            { num: '03', title: 'Generate and review', desc: 'Our AI engine instantly drafts the contract. Review and edit as needed.' },
            { num: '04', title: 'Download or use', desc: 'Export securely to PDF or Word, ready for signatures or filing.' },
        ]
    },

    // ─── AUDIENCE ───────────────────────────────────────────────────────────────
    { section: 'audience', page: 'landing', key: 'audience.section_tag', contentType: 'text', value: 'Who it is for', label: 'Section Tag Label', order: 1 },
    { section: 'audience', page: 'landing', key: 'audience.headline', contentType: 'text', value: 'Built for modern teams and professionals.', label: 'Headline', order: 2 },
    {
        section: 'audience', page: 'landing', key: 'audience.cards', contentType: 'json', order: 3,
        label: 'Audience Cards (JSON Array)',
        description: 'Array of { label, desc }',
        value: [
            { label: 'Startups', desc: 'Draft incorporation documents, founder agreements, NDAs, and equity structures instantly.' },
            { label: 'Freelancers', desc: 'Protect your work with bulletproof service contracts, invoices, and IP assignments.' },
            { label: 'Small Businesses', desc: 'Manage employment agreements, compliance checklists, and corporate policies.' },
            { label: 'Individuals', desc: 'Handle personal legal matters like rental agreements, wills, and basic legal guidance.' },
        ]
    },

    // ─── TESTIMONIALS ────────────────────────────────────────────────────────────
    { section: 'testimonials', page: 'landing', key: 'testimonials.headline', contentType: 'text', value: 'Trusted by professionals navigating complex work.', label: 'Headline', order: 1 },
    { section: 'testimonials', page: 'landing', key: 'testimonials.subheadline', contentType: 'text', value: 'Built for founders, businesses, legal teams, and professionals who need to move through complex legal work with clarity and confidence.', label: 'Subheadline', order: 2 },
    {
        section: 'testimonials', page: 'landing', key: 'testimonials.items', contentType: 'json', order: 3,
        label: 'Testimonials (JSON Array)',
        description: 'Array of { id, name, role, company?, text, avatar, image?, featured? }',
        value: [
            { id: 't1', name: 'Priya Sharma', role: 'Startup Founder', text: 'Vidhik AI helped us draft all our incorporation documents in under an hour. The speed and precision is unmatched, letting us focus entirely on building our product.', avatar: 'PS', featured: false },
            { id: 't2', name: 'Anita Desai', role: 'Director', company: 'Desai Ventures', text: 'The contract review feature is a game changer. It consistently catches clauses I would have missed and allows us to negotiate with absolute clarity and zero anxiety.', avatar: 'AD', featured: true },
            { id: 't3', name: 'Rahul Mehra', role: 'Freelance Designer', text: 'I finally have proper contracts for my clients. The AI assistant answered all my legal questions instantly. It\'s the best tool for protecting my independent business.', avatar: 'RM', featured: false },
        ]
    },

    // ─── PRICING ────────────────────────────────────────────────────────────────
    { section: 'pricing', page: 'landing', key: 'pricing.headline', contentType: 'text', value: 'Smart pricing for serious growth.', label: 'Headline', order: 1 },
    { section: 'pricing', page: 'landing', key: 'pricing.subheadline', contentType: 'text', value: 'Our plans are designed to give you everything you need to scale your legal operations securely.', label: 'Subheadline', order: 2 },
    {
        section: 'pricing', page: 'landing', key: 'pricing.plans', contentType: 'json', order: 3,
        label: 'Pricing Plans (JSON Array)',
        description: 'Array of { name, price, desc, features[], popular? }',
        value: [
            { name: 'Free', price: '$0', desc: 'Perfect for individuals trying out AI legal tools.', features: ['5 documents/month', 'Basic AI chat', 'Email support'], popular: false },
            { name: 'Pro', price: '$29', desc: 'For freelancers and small teams needing full capabilities.', features: ['Unlimited documents', 'Contract review', 'Document storage', 'Priority support'], popular: true },
            { name: 'Business', price: '$79', desc: 'Advanced compliance and team management features.', features: ['Team access', 'Task management', 'Priority legal consultation', 'Custom templates'], popular: false },
        ]
    },

    // ─── FAQ ────────────────────────────────────────────────────────────────────
    { section: 'faq', page: 'landing', key: 'faq.headline', contentType: 'text', value: 'Frequently asked questions.', label: 'Headline', order: 1 },
    {
        section: 'faq', page: 'landing', key: 'faq.items', contentType: 'json', order: 2,
        label: 'FAQ Items (JSON Array)',
        description: 'Array of { question, answer }',
        value: [
            { question: 'Are the legal documents legally binding?', answer: 'Yes. Documents generated by Vidhik AI are based on verified templates used by practicing lawyers. However, they should be reviewed to ensure they meet your specific jurisdiction\'s requirements.' },
            { question: 'How secure is my data and confidential information?', answer: 'We use enterprise-grade encryption for all data at rest and in transit. We do not use your proprietary documents to train public AI models. Your data remains strictly within your secure workspace.' },
            { question: 'Can I consult a human lawyer if I need help?', answer: 'Absolutely. Our platform connects you with verified legal professionals. You can book a consultation or request a formal review of any document generated on the platform.' },
            { question: 'What types of documents can I generate?', answer: 'You can generate a wide range of documents including Non-Disclosure Agreements, Employment Contracts, Board Resolutions, Consultant Agreements, and many more standard corporate and commercial documents.' },
            { question: 'Is the AI Legal Assistant giving legal advice?', answer: 'The AI provides legal information, analysis of case laws, and standard interpretations, but it does not constitute formal legal advice. For definitive legal advice, we recommend consulting one of our verified lawyers.' },
        ]
    },

    // ─── NAVBAR ──────────────────────────────────────────────────────────────────
    { section: 'navbar', page: 'landing', key: 'navbar.brand_name', contentType: 'text', value: 'Vidhik AI', label: 'Brand Name', order: 1 },
    { section: 'navbar', page: 'landing', key: 'navbar.logo_url', contentType: 'url', value: '', label: 'Logo Image URL', description: 'Leave empty to use default local logo.', order: 2 },
    {
        section: 'navbar', page: 'landing', key: 'navbar.links', contentType: 'json', order: 3,
        label: 'Navigation Links (JSON Array)',
        description: 'Array of { label, href }',
        value: [
            { label: 'How It Works', href: '/how-it-works' },
            { label: 'Services', href: '/services' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'About', href: '/about' },
        ]
    },

    // ─── FOOTER ──────────────────────────────────────────────────────────────────
    { section: 'footer', page: 'landing', key: 'footer.tagline', contentType: 'text', value: 'Legal work, drafted with intelligence.', label: 'Footer Tagline', order: 1 },
    { section: 'footer', page: 'landing', key: 'footer.copyright', contentType: 'text', value: '© 2024 Vidhik AI. All rights reserved.', label: 'Copyright Text', order: 2 },

    // ─── ABOUT PAGE ──────────────────────────────────────────────────────────────
    { section: 'about_hero', page: 'about', key: 'about.headline', contentType: 'text', value: 'We\'re building the future of legal work', label: 'About Page Headline', order: 1 },
    { section: 'about_hero', page: 'about', key: 'about.subheadline', contentType: 'text', value: 'Vidhik AI is on a mission to make high-quality legal services accessible to everyone through the power of artificial intelligence.', label: 'About Page Subheadline', order: 2 },

    // ─── SERVICES PAGE ───────────────────────────────────────────────────────────
    { section: 'services_hero', page: 'services', key: 'services.headline', contentType: 'text', value: 'Everything you need for legal work', label: 'Services Page Headline', order: 1 },
    { section: 'services_hero', page: 'services', key: 'services.subheadline', contentType: 'text', value: 'From document generation to live consultations, Vidhik AI provides a complete legal workspace.', label: 'Services Page Subheadline', order: 2 },
];

// ─── PUBLIC: GET ALL CONTENT FOR A PAGE ────────────────────────────────────────
export const getPageContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page } = req.params;
        const filter: any = { isActive: true };
        if (page && page !== 'all') filter.page = page;

        const content = await WebsiteContent.find(filter).sort({ section: 1, order: 1 });

        // Transform to a nested map: { section: { key: value, ... }, ... }
        const contentMap: Record<string, any> = {};
        for (const item of content) {
            if (!contentMap[item.section]) contentMap[item.section] = {};
            // Use the last part of the key as the field name inside the section
            const fieldName = item.key.includes('.') ? item.key.split('.').slice(1).join('.') : item.key;
            contentMap[item.section][fieldName] = item.value;
        }

        res.json({ success: true, data: contentMap, raw: content });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: GET ALL CONTENT (with metadata) ────────────────────────────────────
export const getAllContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page, section } = req.query;
        const filter: any = {};
        if (page) filter.page = page;
        if (section) filter.section = section;

        const content = await WebsiteContent.find(filter).sort({ page: 1, section: 1, order: 1 });
        res.json({ success: true, data: content });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: UPDATE CONTENT ITEM ────────────────────────────────────────────────
export const updateContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { value, label, description, isActive, order } = req.body;

        const updated = await WebsiteContent.findByIdAndUpdate(
            id,
            { value, label, description, isActive, order, updatedBy: (req as any).user?.id || 'admin' },
            { new: true, runValidators: true }
        );

        if (!updated) {
            res.status(404).json({ success: false, message: 'Content item not found' });
            return;
        }

        res.json({ success: true, data: updated, message: 'Content updated successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: UPDATE CONTENT BY KEY ──────────────────────────────────────────────
export const updateContentByKey = async (req: Request, res: Response): Promise<void> => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const updated = await WebsiteContent.findOneAndUpdate(
            { key },
            { value, updatedBy: (req as any).user?.id || 'admin' },
            { new: true }
        );

        if (!updated) {
            res.status(404).json({ success: false, message: 'Content key not found' });
            return;
        }

        res.json({ success: true, data: updated, message: 'Content updated successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: BULK UPDATE ─────────────────────────────────────────────────────────
export const bulkUpdateContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { updates } = req.body; // Array of { id, value }
        if (!Array.isArray(updates)) {
            res.status(400).json({ success: false, message: 'updates must be an array' });
            return;
        }

        const results = await Promise.all(
            updates.map(({ id, value }: { id: string; value: any }) =>
                WebsiteContent.findByIdAndUpdate(
                    id,
                    { value, updatedBy: (req as any).user?.id || 'admin' },
                    { new: true }
                )
            )
        );

        res.json({ success: true, data: results, message: `${results.length} items updated` });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: SEED DEFAULT CONTENT ───────────────────────────────────────────────
export const seedDefaultContent = async (req: Request, res: Response): Promise<void> => {
    try {
        let created = 0;
        let skipped = 0;

        for (const item of DEFAULT_CONTENT) {
            const exists = await WebsiteContent.findOne({ key: item.key });
            if (!exists) {
                await WebsiteContent.create(item);
                created++;
            } else {
                skipped++;
            }
        }

        res.json({ success: true, message: `Seeded ${created} items, skipped ${skipped} existing.` });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: RESET SECTION TO DEFAULT ──────────────────────────────────────────
export const resetSectionToDefault = async (req: Request, res: Response): Promise<void> => {
    try {
        const { section, page } = req.params;
        const defaults = DEFAULT_CONTENT.filter(d => d.section === section && d.page === page);

        if (!defaults.length) {
            res.status(404).json({ success: false, message: 'No defaults found for this section/page.' });
            return;
        }

        for (const d of defaults) {
            await WebsiteContent.findOneAndUpdate(
                { key: d.key },
                { value: d.value },
                { new: true }
            );
        }

        res.json({ success: true, message: `Section "${section}" on page "${page}" reset to defaults.` });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: CREATE NEW CONTENT ITEM ────────────────────────────────────────────
export const createContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { section, page, key, contentType, value, label, description, order } = req.body;

        const exists = await WebsiteContent.findOne({ key });
        if (exists) {
            res.status(400).json({ success: false, message: 'Key already exists. Use PUT to update.' });
            return;
        }

        const item = await WebsiteContent.create({
            section, page, key, contentType, value, label, description, order,
            updatedBy: (req as any).user?.id || 'admin'
        });

        res.status(201).json({ success: true, data: item, message: 'Content item created.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: DELETE CONTENT ITEM ────────────────────────────────────────────────
export const deleteContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await WebsiteContent.findByIdAndDelete(id);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Content item not found' });
            return;
        }
        res.json({ success: true, message: 'Content item deleted.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
