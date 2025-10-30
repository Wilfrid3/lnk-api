const axios = require('axios');
const io = require('socket.io-client');

const API_BASE_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

// Test user credentials
const testUsers = [
  { email: 'user1@test.com', password: 'password123' },
  { email: 'user2@test.com', password: 'password123' }
];

async function testSocketEvents() {
  try {
    console.log('🧪 Testing Socket Event Notifications...\n');

    // 1. Login both users and get tokens
    console.log('1. Logging in users...');
    const tokens = [];
    const userIds = [];

    for (const user of testUsers) {
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, user);
        tokens.push(response.data.access_token);
        userIds.push(response.data.user.id);
        console.log(`✅ User ${user.email} logged in successfully`);
      } catch (error) {
        console.log(`❌ Failed to login ${user.email}:`, error.response?.data?.message || error.message);
        return;
      }
    }

    // 2. Connect WebSocket clients
    console.log('\n2. Connecting WebSocket clients...');
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
        console.log(`✅ Client ${i + 1} connected`);
      });

      client.on('new_conversation', (data) => {
        events.push({ type: 'new_conversation', client: i + 1, data });
        console.log(`📝 Client ${i + 1} received new_conversation event`);
      });

      client.on('new_message', (data) => {
        events.push({ type: 'new_message', client: i + 1, data });
        console.log(`💬 Client ${i + 1} received new_message event`);
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
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Create a new conversation
    console.log('\n3. Creating new conversation...');
    const conversationData = {
      participants: [userIds[1]], // Add second user
      type: 'direct'
    };

    const conversationResponse = await axios.post(
      `${API_BASE_URL}/messaging/conversations`,
      conversationData,
      { headers: { Authorization: `Bearer ${tokens[0]}` } }
    );

    const conversationId = conversationResponse.data._id;
    console.log(`✅ Conversation created: ${conversationId}`);

    // Wait for event propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Send a message
    console.log('\n4. Sending message...');
    const messageData = {
      content: 'Hello! This is a test message.',
      type: 'text'
    };

    const messageResponse = await axios.post(
      `${API_BASE_URL}/messaging/conversations/${conversationId}/messages`,
      messageData,
      { headers: { Authorization: `Bearer ${tokens[0]}` } }
    );

    const messageId = messageResponse.data._id;
    console.log(`✅ Message sent: ${messageId}`);

    // Wait for event propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Update the message
    console.log('\n5. Updating message...');
    const updateData = {
      content: 'Hello! This is an updated test message.'
    };

    await axios.patch(
      `${API_BASE_URL}/messaging/messages/${messageId}`,
      updateData,
      { headers: { Authorization: `Bearer ${tokens[0]}` } }
    );

    console.log(`✅ Message updated`);

    // Wait for event propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Analyze received events
    console.log('\n6. Event Summary:');
    console.log(`📊 Total events received: ${events.length}`);

    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Events by type:', eventsByType);

    // Check if all expected events were received
    const expectedEvents = ['new_conversation', 'new_message', 'message_updated'];
    const receivedTypes = Object.keys(eventsByType);

    console.log('\n7. Event Validation:');
    for (const expectedEvent of expectedEvents) {
      if (receivedTypes.includes(expectedEvent)) {
        console.log(`✅ ${expectedEvent}: ${eventsByType[expectedEvent]} events received`);
      } else {
        console.log(`❌ ${expectedEvent}: No events received`);
      }
    }

    // 8. Cleanup
    console.log('\n8. Cleanup...');
    clients.forEach(client => client.disconnect());
    console.log('✅ All clients disconnected');

    console.log('\n🎉 Socket event test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSocketEvents();
