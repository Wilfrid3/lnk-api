const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  baseURL: BASE_URL,
  // You'll need to replace this with a valid JWT token
  authToken: 'your_jwt_token_here',
  // Test user ID
  userId: 'test_user_id',
};

// Mock subscription data for testing
const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
  keys: {
    p256dh: 'BKxXpCvUfk...',
    auth: 'abc123def456...',
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

async function testNotificationSystem() {
  console.log('🚀 Testing Push Notifications System\n');

  const headers = {
    'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // Test 1: Subscribe to notifications
    console.log('1️⃣ Testing subscription...');
    const subscribeResponse = await axios.post(
      `${TEST_CONFIG.baseURL}/notifications/subscribe`,
      mockSubscription,
      { headers }
    );
    console.log('✅ Subscription successful:', subscribeResponse.data);

    // Test 2: Get subscriptions count
    console.log('\n2️⃣ Testing subscriptions count...');
    const countResponse = await axios.get(
      `${TEST_CONFIG.baseURL}/notifications/subscriptions/count`,
      { headers }
    );
    console.log('✅ Subscriptions count:', countResponse.data);

    // Test 3: Get user subscriptions
    console.log('\n3️⃣ Testing get user subscriptions...');
    const subscriptionsResponse = await axios.get(
      `${TEST_CONFIG.baseURL}/notifications/subscriptions`,
      { headers }
    );
    console.log('✅ User subscriptions:', subscriptionsResponse.data);

    // Test 4: Send test welcome notification
    console.log('\n4️⃣ Testing welcome notification...');
    const welcomeResponse = await axios.post(
      `${TEST_CONFIG.baseURL}/notifications/test/welcome`,
      {},
      { headers }
    );
    console.log('✅ Welcome notification sent:', welcomeResponse.data);

    // Test 5: Send custom notification (requires admin token)
    console.log('\n5️⃣ Testing custom notification (admin required)...');
    try {
      const customNotificationData = {
        title: 'Test Notification',
        body: 'This is a test notification from the API',
        url: '/test',
        icon: '/icons/test-icon.png',
      };

      const customResponse = await axios.post(
        `${TEST_CONFIG.baseURL}/notifications/send`,
        customNotificationData,
        { headers }
      );
      console.log('✅ Custom notification sent:', customResponse.data);
    } catch (adminError) {
      console.log('⚠️ Custom notification failed (admin access required):', adminError.response?.data || adminError.message);
    }

    // Test 6: Unsubscribe
    console.log('\n6️⃣ Testing unsubscribe...');
    const unsubscribeResponse = await axios.post(
      `${TEST_CONFIG.baseURL}/notifications/unsubscribe`,
      { endpoint: mockSubscription.endpoint },
      { headers }
    );
    console.log('✅ Unsubscription successful:', unsubscribeResponse.data);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('\nMake sure to:');
    console.error('1. Update TEST_CONFIG.authToken with a valid JWT token');
    console.error('2. Ensure the API server is running');
    console.error('3. Check that VAPID keys are configured in .env');
  }
}

// Additional test for service methods (if running in the same environment)
function showServiceMethodExamples() {
  console.log('\n📚 Service Method Examples:\n');
  
  const examples = `
// In your other services, inject NotificationsService:

constructor(
  private readonly notificationsService: NotificationsService,
) {}

// Send welcome notification after user registration
await this.notificationsService.sendWelcomeNotification(userId);

// Send message notification
await this.notificationsService.sendMessageNotification(
  receiverId,
  'John Doe',
  'Hello, how are you?'
);

// Send like notification
await this.notificationsService.sendLikeNotification(
  postOwnerId,
  'Jane Smith',
  'My awesome post title'
);

// Send comment notification
await this.notificationsService.sendCommentNotification(
  postOwnerId,
  'Mike Johnson',
  'Great post! I really enjoyed reading it.',
  'My awesome post title'
);

// Send custom notification to specific users
await this.notificationsService.sendNotification({
  title: 'New Feature!',
  body: 'Check out our latest update',
  url: '/features',
  userIds: ['user1', 'user2'],
  icon: '/icons/feature.png'
});
`;

  console.log(examples);
}

if (require.main === module) {
  console.log('Push Notifications Test Script');
  console.log('==============================\n');
  
  if (!TEST_CONFIG.authToken || TEST_CONFIG.authToken === 'your_jwt_token_here') {
    console.error('❌ Please update TEST_CONFIG.authToken with a valid JWT token');
    process.exit(1);
  }
  
  testNotificationSystem()
    .then(() => {
      showServiceMethodExamples();
    })
    .catch(console.error);
}
