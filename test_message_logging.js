const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

// Test user credentials
const testUser = { email: 'user1@test.com', password: 'password123' };

async function testMessageCreation() {
  try {
    console.log('🧪 Testing Message Creation with Socket Event Logging...\n');

    // 1. Login user
    console.log('1. Logging in user...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, testUser);
    const token = loginResponse.data.access_token;
    const userId = loginResponse.data.user.id;
    console.log(`✅ User logged in: ${userId}`);

    // 2. Check for existing conversations or create one
    console.log('\n2. Getting user conversations...');
    const conversationsResponse = await axios.get(
      `${API_BASE_URL}/api/conversations`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let conversationId;
    if (conversationsResponse.data.conversations.length > 0) {
      conversationId = conversationsResponse.data.conversations[0]._id;
      console.log(`✅ Using existing conversation: ${conversationId}`);
    } else {
      // Create a conversation with yourself for testing
      console.log('📝 Creating new conversation...');
      const createConvResponse = await axios.post(
        `${API_BASE_URL}/api/conversations`,
        {
          participants: [userId], // Just yourself for testing
          type: 'direct'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      conversationId = createConvResponse.data._id;
      console.log(`✅ Created conversation: ${conversationId}`);
    }

    // 3. Send a message
    console.log('\n3. Sending message...');
    console.log('🔍 Check server logs for socket event notifications...');
    
    const messageData = {
      content: `Test message sent at ${new Date().toISOString()}`,
      type: 'text'
    };

    const messageResponse = await axios.post(
      `${API_BASE_URL}/api/conversations/${conversationId}/messages`,
      messageData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const messageId = messageResponse.data._id;
    console.log(`✅ Message sent: ${messageId}`);
    console.log(`📝 Content: ${messageResponse.data.content}`);

    // 4. Update the message
    console.log('\n4. Updating message...');
    console.log('🔍 Check server logs for message update socket events...');

    const updateData = {
      content: `Updated test message at ${new Date().toISOString()}`
    };

    const updateResponse = await axios.put(
      `${API_BASE_URL}/api/messages/${messageId}`,
      updateData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`✅ Message updated: ${updateResponse.data._id}`);
    console.log(`📝 New content: ${updateResponse.data.content}`);

    console.log('\n🎉 Test completed! Check server logs for socket event notifications.');
    console.log('\nExpected logs in server console:');
    console.log('- 📨 MessageService: Calling notifyNewMessage...');
    console.log('- 🚀 Sending new_message event to conversation:...');
    console.log('- ✅ new_message event sent successfully...');
    console.log('- 🔄 MessageService: Calling notifyMessageUpdate...');
    console.log('- 🔄 Sending message_updated event to conversation:...');
    console.log('- ✅ message_updated event sent successfully...');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testMessageCreation();
