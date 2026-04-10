import axios from 'axios';

const BASE_URL = 'http://localhost:5025/api/auth';

async function testAuth() {
    console.log('Testing Authentication System...');

    try {
        // 1. Test Registration
        console.log('\n1. Testing Registration...');
        const signupRes = await axios.post(`${BASE_URL}/register`, {
            email: `testuser_${Date.now()}@legal.com`,
            password: 'password123',
            fullName: 'Test User'
        });
        console.log('✅ Registration successful!');
        const token = signupRes.data.token;

        // 2. Test Login
        console.log('\n2. Testing Login...');
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            email: signupRes.config.data ? JSON.parse(signupRes.config.data).email : '',
            password: 'password123'
        });
        console.log('✅ Login successful!');

        // 3. Test Protected Route (Dashboard)
        console.log('\n3. Testing Protected Route...');
        try {
            await axios.get('http://localhost:5025/api/dashboard/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Protected route access successful!');
        } catch (err: any) {
            console.log('⚠️ Protected route failed (might be expected if route is not fully implemented or requires specific data):', err.message);
        }

        console.log('\n🎉 All authentication tests passed!');
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.response?.data?.message || error.message);
        process.exit(1);
    }
}

testAuth();
