const webpush = require('web-push');
require('dotenv').config();

async function debugPushNotification() {
  console.log('🔍 Debugging Push Notification Setup\n');

  // Check environment variables
  console.log('1️⃣ Checking Environment Variables:');
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  console.log(`VAPID_EMAIL: ${vapidEmail ? '✅ Set' : '❌ Missing'}`);
  console.log(`VAPID_PUBLIC_KEY: ${vapidPublicKey ? '✅ Set (' + vapidPublicKey.substring(0, 20) + '...)' : '❌ Missing'}`);
  console.log(`VAPID_PRIVATE_KEY: ${vapidPrivateKey ? '✅ Set (' + vapidPrivateKey.substring(0, 20) + '...)' : '❌ Missing'}`);

  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    console.log('\n❌ Missing required VAPID configuration. Please set all three environment variables.');
    return;
  }

  // Validate VAPID keys format
  console.log('\n2️⃣ Validating VAPID Keys Format:');
  try {
    // Public key should be base64url encoded and around 65 characters
    if (vapidPublicKey.length < 80 || vapidPublicKey.length > 90) {
      console.log(`⚠️ Public key length seems unusual: ${vapidPublicKey.length} characters`);
    } else {
      console.log('✅ Public key length looks good');
    }

    // Private key should be base64url encoded and around 43 characters
    if (vapidPrivateKey.length < 40 || vapidPrivateKey.length > 50) {
      console.log(`⚠️ Private key length seems unusual: ${vapidPrivateKey.length} characters`);
    } else {
      console.log('✅ Private key length looks good');
    }

    // Test VAPID setup
    webpush.setVapidDetails(
      `mailto:${vapidEmail}`,
      vapidPublicKey,
      vapidPrivateKey
    );
    console.log('✅ VAPID keys are valid and properly formatted');

  } catch (error) {
    console.log('❌ VAPID keys validation failed:', error.message);
    return;
  }

  // Create a test subscription (you'll need to replace with actual subscription from your database)
  console.log('\n3️⃣ Testing Push Notification Send:');
  console.log('To test with your actual subscription, please:');
  console.log('1. Copy a subscription from your MongoDB database');
  console.log('2. Replace the testSubscription object below');
  console.log('3. Run this script again\n');

  // Real subscription from your MongoDB database
  const testSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/dDRIeSXSNzo:APA91bF2oIqKjPx5zZ5LOYCh7DrR2g5rJFIbE-XFK1-qTPWMVFVzFEfY3tFxZt3RYPIggzUsdZAdzJ1qyk5NynEXq0--ORWEM98BCHlnfLVGpvAdMb2EoyXpQQytY5qAyQqjeXRTob7s',
    keys: {
      p256dh: 'BHYyhb-pAKYFF0Kp1SrU-ZSGJbfpyCOg_9oOgJseo0udmzA-_nXXL1CZQl5WIhLgtg23b5zD1E_X7mFi0wMj0gc',
      auth: '9PPn-h09tQB5meh_xat4Sg'
    }
  };

  console.log('✅ Using real subscription data from MongoDB');
  console.log(`Endpoint: ${testSubscription.endpoint.substring(0, 50)}...`);
  console.log(`P256DH: ${testSubscription.keys.p256dh.substring(0, 20)}...`);
  console.log(`Auth: ${testSubscription.keys.auth.substring(0, 10)}...`);

  try {
    const payload = JSON.stringify({
      title: 'Debug Test Notification',
      body: 'If you see this, push notifications are working!',
      icon: '/icon.png'
    });

    console.log('Sending test notification...');
    const result = await webpush.sendNotification(testSubscription, payload);
    console.log('✅ Test notification sent successfully!');
    console.log('Result:', result);

  } catch (error) {
    console.log('❌ Failed to send test notification:');
    console.log('Error code:', error.statusCode);
    console.log('Error message:', error.message);
    console.log('Error body:', error.body);

    // Provide specific troubleshooting based on error
    if (error.statusCode === 400) {
      console.log('\n🔧 Troubleshooting 400 Error:');
      console.log('- Check if the subscription endpoint is valid');
      console.log('- Verify p256dh and auth keys are correct');
      console.log('- Ensure the payload is valid JSON');
    } else if (error.statusCode === 410) {
      console.log('\n🔧 Troubleshooting 410 Error:');
      console.log('- The subscription has expired or is invalid');
      console.log('- User may need to resubscribe');
    } else if (error.statusCode === 413) {
      console.log('\n🔧 Troubleshooting 413 Error:');
      console.log('- Payload is too large (max 4KB)');
      console.log('- Reduce the size of your notification data');
    }
  }

  console.log('\n4️⃣ Additional Debugging Steps:');
  console.log('- Check browser console for service worker errors');
  console.log('- Verify notification permissions are granted');
  console.log('- Ensure your site is served over HTTPS (except localhost)');
  console.log('- Test with different browsers');
  console.log('- Check if your firewall/antivirus is blocking requests');
}

// Check web-push library details
console.log('Web-push library version:', require('web-push/package.json').version);
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('================================\n');

debugPushNotification().catch(console.error);
