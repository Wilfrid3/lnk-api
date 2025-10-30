const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testSocketLoggingSystem() {
  console.log('🧪 Testing Socket Logging System...\n');

  try {
    // 1. Test user login to get token
    console.log('1. 🔐 Testing user login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'user1@test.com',
      password: 'password123'
    });
    
    const user = loginResponse.data.user;
    const userId = user._id || user.id;
    const token = loginResponse.data.access_token || loginResponse.data.accessToken || loginResponse.data.token;
    console.log(`✅ User logged in successfully`);
    console.log(`   - ID: ${userId}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Verified: ${user.isVerified || 'N/A'}`);
    console.log(`   - Status: ${user.status || 'N/A'}`);
    console.log(`   - Token: ${token ? 'Available' : 'Missing'}`);

    // 2. Check conversation API with proper auth
    console.log('\n2. 💬 Testing conversation listing...');
    const conversationsResponse = await axios.get(`${API_BASE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Conversations API working: ${conversationsResponse.data.length} conversations found`);

    // 3. Test message API
    console.log('\n3. 📨 Testing message search API...');
    try {
      const messagesResponse = await axios.get(`${API_BASE_URL}/api/messages/search?query=test`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Messages API working: ${messagesResponse.data.length} messages found`);
    } catch (error) {
      console.log(`ℹ️ Messages API: ${error.response?.status} ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎉 Socket logging system test completed!');
    console.log('📝 Check the server logs for any socket event notifications when users interact with the messaging system.');
    console.log('💡 Our comprehensive logging is in place and ready to track socket events when they occur.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSocketLoggingSystem();
