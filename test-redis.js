const { createClient } = require('redis');

async function testRedisConnection() {
  const client = createClient({
    socket: {
      host: 'localhost',
      port: 6379
    }
  });

  try {
    await client.connect();
    console.log('✅ Redis connection successful!');
    
    // Test set/get
    await client.set('test-key', 'Hello Redis!');
    const value = await client.get('test-key');
    console.log('✅ Redis set/get test:', value);
    
    // Test ping
    const pong = await client.ping();
    console.log('✅ Redis ping test:', pong);
    
    await client.disconnect();
    console.log('✅ Redis disconnected successfully');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
  }
}

testRedisConnection();
