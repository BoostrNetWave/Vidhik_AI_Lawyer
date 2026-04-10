import axios from 'axios';

const BASE_URL = 'http://localhost:5025/api';

async function testSupportSystem() {
    console.log('Testing Support System...\n');

    try {
        // 1. First, register a test user
        console.log('1. Registering test user...');
        const signupRes = await axios.post(`${BASE_URL}/auth/register`, {
            email: `testuser_${Date.now()}@legal.com`,
            password: 'password123',
            fullName: 'Test User'
        });
        console.log('✅ User registered!');
        const token = signupRes.data.token;
        const userId = signupRes.data.user.id;
        console.log('User ID:', userId);

        // 2. Create a test ticket
        console.log('\n2. Creating test support ticket...');
        const createTicketRes = await axios.post(
            `${BASE_URL}/support/tickets`,
            {
                userId: userId,
                subject: 'Test Support Ticket',
                category: 'Technical',
                priority: 'High',
                description: 'This is a test ticket to verify the support system works.'
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('✅ Ticket created:', createTicketRes.data.ticketId);

        // 3. Fetch tickets for this user
        console.log('\n3. Fetching tickets for user...');
        const getTicketsRes = await axios.get(
            `${BASE_URL}/support/tickets?userId=${userId}&page=1&limit=20`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('✅ Tickets fetched:', getTicketsRes.data.data.length, 'ticket(s)');
        console.log('Ticket data:', JSON.stringify(getTicketsRes.data, null, 2));

        console.log('\n🎉 Support system is working correctly!');
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        process.exit(1);
    }
}

testSupportSystem();
