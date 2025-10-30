const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

// Test users to create
const testUsers = [
  {
    name: 'Test User 1',
    email: 'user1@test.com',
    password: 'password123',
    phone: '+33123456789',
    location: {
      type: 'Point',
      coordinates: [2.3522, 48.8566]
    },
    city: 'Paris',
    country: 'France'
  },
  {
    name: 'Test User 2', 
    email: 'user2@test.com',
    password: 'password123',
    phone: '+33987654321',
    location: {
      type: 'Point',
      coordinates: [2.3522, 48.8566]
    },
    city: 'Paris',
    country: 'France'
  }
];

async function createTestUsers() {
  console.log('🧪 Creating test users for socket testing...\n');

  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    try {
      console.log(`Creating user ${i + 1}: ${user.email}`);
      
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, user);
      
      console.log(`✅ User ${user.email} created successfully`);
      console.log(`   ID: ${response.data.user.id}`);
      console.log(`   Name: ${response.data.user.name}`);
      
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        console.log(`📝 User ${user.email} already exists - skipping`);
      } else {
        console.log(`❌ Failed to create user ${user.email}:`, error.response?.data?.message || error.message);
      }
    }
  }

  console.log('\n🎉 Test user creation completed!');
  console.log('You can now run: node test_socket_events.js');
}

// Run the creation
createTestUsers();
