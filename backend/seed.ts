import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Blog from './models/Blog.js';
import Booking from './models/Booking.js';
import SupportTicket from './models/SupportTicket.js';
import User from './models/User.js';

dotenv.config();

const seedData = async (): Promise<void> => {
    try {
        if (process.env.NODE_ENV === 'production') {
            console.error('CRITICAL: Cannot run seed script in production mode!');
            process.exit(1);
        }
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await Blog.deleteMany({});
        await Booking.deleteMany({});
        await SupportTicket.deleteMany({});
        await User.deleteMany({});

        // Seed Blogs
        const blogs = [
            {
                title: 'Introduction to Intellectual Property Rights in India',
                content: 'IPR is a crucial aspect of modern business...',
                status: 'Published',
                type: 'Insights',
                premium: false,
                author: 'Legal Admin'
            },
            {
                title: 'New Labor Codes: What Employers Need to Know',
                content: 'The government has introduced several changes to labor laws...',
                status: 'Published',
                type: 'Legal News',
                premium: true,
                price: 499,
                author: 'Legal Admin'
            }
        ];
        await Blog.insertMany(blogs);
        console.log('Blogs seeded!');

        // Seed Bookings
        const bookings = [
            {
                clientName: 'Rahul Sharma',
                email: 'rahul@example.com',
                userId: '6878e1ae0fb58374501b677e',
                serviceType: 'Corporate Law',
                date: new Date(2026, 0, 20),
                status: 'completed',
                amount: 2500
            },
            {
                clientName: 'Priya Verma',
                email: 'priya@example.com',
                userId: '6878e1ae0fb58374501b677e',
                serviceType: 'Family Law',
                date: new Date(2026, 0, 25),
                status: 'pending',
                amount: 1500
            }
        ];
        await Booking.insertMany(bookings);
        console.log('Bookings seeded!');

        // Seed Support Tickets
        const tickets = [
            {
                ticketId: 'TKT-123456-1',
                userId: '6878e1ae0fb58374501b677e',
                subject: 'Cannot access premium blog',
                category: 'Technical',
                priority: 'High',
                description: 'I paid for the premium blog but still cannot read it.',
                status: 'Open'
            },
            {
                ticketId: 'TKT-789012-2',
                userId: '6878e1ae0fb58374501b677e',
                subject: 'Booking rescheduling',
                category: 'Booking',
                priority: 'Medium',
                description: 'Need to reschedule my consultation with the lawyer.',
                status: 'Open'
            }
        ];
        await SupportTicket.insertMany(tickets);
        console.log('Support tickets seeded!');

        // Seed Default Admin User
        const user = {
            userId: '6878e1ae0fb58374501b677e',
            email: 'admin@legal.com',
            password: '$2a$10$YourHashedPasswordHere', // This will be replaced when you register
            fullName: 'Legal Admin',
            title: 'Senior Counsel',
            expertise: 'Civil Law, Corporate Law',
            hourlyRate: 200,
            bio: 'Experienced legal professional with over 15 years in civil litigation.',
            bankName: 'Global Bank',
            accountNumber: '123456789',
            ifsc: 'GBLB0001234'
        };
        await User.create(user);
        console.log('Default user seeded!');


        console.log('Seeding complete! Closing connection...');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedData();
