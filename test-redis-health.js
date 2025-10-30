const { createClient } = require('redis');

async function testRedisHealth() {
  console.log('Testing Redis health...');
  
  const client = createClient({
    socket: {
      host: 'localhost',
      port: 6379,
    }
  });

  try {
    console.log('Connecting to Redis...');
    await client.connect();
    
    console.log('Client connected, testing ping...');
    const result = await client.ping();
    console.log('Ping result:', result);
    
    await client.disconnect();
    console.log('Disconnected successfully');
  } catch (error) {
    console.error('Redis error:', error.message);
  }
}

testRedisHealth();
