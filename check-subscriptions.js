const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkSubscriptions() {
  console.log('🔍 Checking Push Subscriptions in MongoDB\n');

  // Get MongoDB connection details from environment
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lnk_db';
  const dbName = process.env.MONGODB_DATABASE || 'lnk_db';

  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db(dbName);
    const collection = db.collection('pushsubscriptions');

    console.log('✅ Connected to MongoDB\n');

    // Count total subscriptions
    const totalCount = await collection.countDocuments();
    console.log(`📊 Total subscriptions: ${totalCount}`);

    // Count active subscriptions
    const activeCount = await collection.countDocuments({ isActive: true });
    console.log(`✅ Active subscriptions: ${activeCount}`);

    // Find recent subscriptions
    const recentSubscriptions = await collection
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log('\n📋 Recent Active Subscriptions:');
    recentSubscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. Subscription ID: ${sub._id}`);
      console.log(`   User ID: ${sub.userId}`);
      console.log(`   Endpoint: ${sub.endpoint.substring(0, 60)}...`);
      console.log(`   P256DH: ${sub.p256dh.substring(0, 20)}...`);
      console.log(`   Auth: ${sub.auth.substring(0, 20)}...`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log(`   Last Used: ${sub.lastUsed || 'Never'}`);
      console.log(`   User Agent: ${sub.userAgent || 'Not specified'}`);
    });

    // If you want to test with a specific subscription, uncomment and modify this section:
    /*
    if (recentSubscriptions.length > 0) {
      const testSub = recentSubscriptions[0];
      console.log('\n🧪 Sample subscription for testing:');
      console.log(`Copy this to your debug script:`);
      console.log(`
const testSubscription = {
  endpoint: '${testSub.endpoint}',
  keys: {
    p256dh: '${testSub.p256dh}',
    auth: '${testSub.auth}'
  }
};`);
    }
    */

    await client.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check if MongoDB is running');
    console.log('2. Verify MONGODB_URI in your .env file');
    console.log('3. Ensure database credentials are correct');
  }
}

checkSubscriptions().catch(console.error);
