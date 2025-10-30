const axios = require('axios');
const io = require('socket.io-client');

const API_BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001';

// Test users
const testUsers = [
  { 
    name: 'Test User 1', 
    email: 'user1@test.com', 
    password: 'password123', 
    phoneNumber: '+33123456789',
    countryCode: '+33',
    age: 25,
    userType: 'homme',
    acceptTerms: true
  },
  { 
    name: 'Test User 2', 
    email: 'user2@test.com', 
    password: 'password123', 
    phoneNumber: '+33987654321',
    countryCode: '+33',
    age: 28,
    userType: 'femme',
    acceptTerms: true
  }
];

async function waitForServer() {
  console.log('🔄 Waiting for server to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      await axios.get(`${API_BASE_URL}/api/health`);
      console.log('✅ Server is ready!');
      return true;
    } catch (error) {
      console.log(`⏳ Attempt ${i + 1}/30 - Server not ready yet...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Server failed to start within 60 seconds');
}

async function createUsersIfNeeded() {
  console.log('\n📝 Creating test users if they don\'t exist...');
  
  for (const user of testUsers) {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, user);
      console.log(`✅ User ${user.email} created successfully`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`📋 User ${user.email} already exists`);
      } else {
        console.log(`❌ Failed to create ${user.email}:`, error.response?.data?.message || error.message);
      }
    }
  }
}

async function testSocketEventsWithLogging() {
  try {
    console.log('\n🧪 Testing Socket Event Notifications with Logging...\n');

    // Wait for server
    await waitForServer();
    
    // Create users
    await createUsersIfNeeded();

    // 1. Login users
    console.log('\n1. 🔐 Logging in users...');
    const tokens = [];
    const userIds = [];

    for (const user of testUsers) {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        tokens.push(response.data.access_token);
        userIds.push(response.data.user.id);
        console.log(`✅ User ${user.email} logged in successfully`);
      } catch (error) {
        console.log(`❌ Failed to login ${user.email}:`, error.response?.data?.message || error.message);
        return;
      }
    }

    // 2. Connect WebSocket clients
    console.log('\n2. 🔌 Connecting WebSocket clients...');
    const clients = [];
    const events = [];

    for (let i = 0; i < tokens.length; i++) {
      const client = io(WS_URL, {
        auth: { token: tokens[i] },
        transports: ['websocket']
      });

      clients.push(client);

      // Track events
      client.on('connect', () => {
        console.log(`✅ Client ${i + 1} connected (${userIds[i]})`);
      });

      client.on('new_conversation', (data) => {
        events.push({ type: 'new_conversation', client: i + 1, data });
        console.log(`📝 Client ${i + 1} received new_conversation event`);
      });

      client.on('new_message', (data) => {
        events.push({ type: 'new_message', client: i + 1, data });
        console.log(`💬 Client ${i + 1} received new_message event for conversation: ${data.conversationId}`);
      });

      client.on('message_updated', (data) => {
        events.push({ type: 'message_updated', client: i + 1, data });
        console.log(`✏️ Client ${i + 1} received message_updated event`);
      });

      client.on('connect_error', (error) => {
        console.log(`❌ Client ${i + 1} connection error:`, error.message);
      });
    }

    // Wait for connections
    console.log('⏳ Waiting for WebSocket connections...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Create a conversation
    console.log('\n3. 💬 Creating new conversation...');
    const conversationData = {
      participants: [userIds[1]], // Add second user
      type: 'direct'
    };

    const conversationResponse = await axios.post(
      `${API_BASE_URL}/api/conversations`,
      conversationData,
      { headers: { Authorization: `Bearer ${tokens[0]}` } }
    );

    const conversationId = conversationResponse.data._id;
    console.log(`✅ Conversation created: ${conversationId}`);

    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Send a message
    console.log('\n4. 📨 Sending message...');
    const messageData = {
      content: 'Hello! This is a test message for socket event logging.',
      type: 'text'
    };

    const messageResponse = await axios.post(
      `${API_BASE_URL}/api/conversations/${conversationId}/messages`,
      messageData,
      { headers: { Authorization: `Bearer ${tokens[0]}` } }
    );

    const messageId = messageResponse.data._id;
    console.log(`✅ Message sent: ${messageId}`);
    console.log(`📄 Message content: "${messageResponse.data.content}"`);

    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Update the message
    console.log('\n5. ✏️ Updating message...');
    const updateData = {
      content: 'Hello! This is an UPDATED test message for socket event logging.'
    };

    await axios.patch(
      `${API_BASE_URL}/api/messages/${messageId}`,
      updateData,
      { headers: { Authorization: `Bearer ${tokens[0]}` } }
    );

    console.log(`✅ Message updated`);

    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Results
    console.log('\n📊 Socket Event Results:');
    console.log(`Total events received: ${events.length}`);
    
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    console.log('Events by type:', eventsByType);

    // Check expected events
    const expectedEvents = ['new_conversation', 'new_message', 'message_updated'];
    console.log('\n🔍 Event Validation:');
    for (const expectedEvent of expectedEvents) {
      if (eventsByType[expectedEvent]) {
        console.log(`✅ ${expectedEvent}: ${eventsByType[expectedEvent]} events received`);
      } else {
        console.log(`❌ ${expectedEvent}: No events received`);
      }
    }

    // Cleanup
    console.log('\n🧹 Cleanup...');
    clients.forEach(client => client.disconnect());
    
    console.log('\n🎉 Socket event test with logging completed!');
    console.log('📝 Check the server logs for detailed socket event information.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSocketEventsWithLogging();
