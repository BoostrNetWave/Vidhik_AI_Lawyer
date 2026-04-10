import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SupportTicket from './models/SupportTicket.js';

dotenv.config();

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const allTickets = await SupportTicket.find({});
        // console.log(`\nTotal Tickets in DB: ${allTickets.length}`);

        // console.log('\n--- TICKET DETAILS ---');
        // allTickets.forEach(t => {
        //     console.log(`[${t.status}] ID: ${t.ticketId}, Priority: ${t.priority}, Subject: "${t.subject}"`);
        // });

        const openExactInfo = await SupportTicket.countDocuments({ status: 'Open' });
        const closedExactInfo = await SupportTicket.countDocuments({ status: 'Closed' });
        console.log(`\nBackend Count (status === 'Open'): ${openExactInfo}`);
        // console.log(`Backend Count (status === 'Closed'): ${closedExactInfo}`);

        const notClosedCount = await SupportTicket.countDocuments({ status: { $ne: 'Closed' } });
        console.log(`Support Page Count (status !== 'Closed'): ${notClosedCount}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
