const axios = require('axios');

// Test data
const TEST_USER_ID = '686e78288dfcf29575ebbec1'; // From your like document
const TEST_VIDEO_ID = '6872bb89f022c21742729c71'; // From your like document
const BASE_URL = 'http://localhost:3001/api';

// Mock JWT token - replace with actual token
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODZlNzgyODhkZmNmMjk1NzVlYmJlYzEiLCJwaG9uZU51bWJlciI6IiszMzc1MzIwMjgxNiIsImlhdCI6MTczNjcxNjQ2NywiZXhwIjoxNzM2NzIwMDY3fQ.VJYxqgZKyJOEJfutdM_DsKhRXh_wHfPgCGzIlWwXkis';

async function testVideoLikes() {
  console.log('🔍 Testing Video Likes Debug...\n');
  
  try {
    // Test 1: Get video feed with authentication
    console.log('📋 Testing video feed with authentication...');
    const feedResponse = await axios.get(`${BASE_URL}/videos?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Video feed response:');
    console.log('Total videos:', feedResponse.data.videos.length);
    console.log('Video IDs:', feedResponse.data.videos.map(v => v.id));
    
    // Check if our test video is in the feed
    const testVideoInFeed = feedResponse.data.videos.find(v => v.id === TEST_VIDEO_ID);
    if (testVideoInFeed) {
      console.log('✅ Test video found in feed:');
      console.log('- ID:', testVideoInFeed.id);
      console.log('- Title:', testVideoInFeed.title);
      console.log('- isLiked:', testVideoInFeed.isLiked);
      console.log('- Likes count:', testVideoInFeed.stats.likes);
    } else {
      console.log('❌ Test video NOT found in feed');
    }
    
    console.log('\n');
    
    // Test 2: Get specific video details
    console.log('📄 Testing specific video details...');
    const videoResponse = await axios.get(`${BASE_URL}/videos/${TEST_VIDEO_ID}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Video details response:');
    console.log('- ID:', videoResponse.data.id);
    console.log('- Title:', videoResponse.data.title);
    console.log('- isLiked:', videoResponse.data.isLiked);
    console.log('- Likes count:', videoResponse.data.stats.likes);
    
    console.log('\n');
    
    // Test 3: Test like functionality
    console.log('❤️  Testing like functionality...');
    const likeResponse = await axios.post(`${BASE_URL}/videos/${TEST_VIDEO_ID}/like`, {}, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Like response:');
    console.log('- Success:', likeResponse.data.success);
    console.log('- Message:', likeResponse.data.message);
    console.log('- isLiked:', likeResponse.data.isLiked);
    console.log('- Likes count:', likeResponse.data.likesCount);
    
    // Test 4: Get feed again to check if like status updated
    console.log('\n📋 Testing video feed after like...');
    const feedAfterLike = await axios.get(`${BASE_URL}/videos?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const testVideoAfterLike = feedAfterLike.data.videos.find(v => v.id === TEST_VIDEO_ID);
    if (testVideoAfterLike) {
      console.log('✅ Test video after like:');
      console.log('- isLiked:', testVideoAfterLike.isLiked);
      console.log('- Likes count:', testVideoAfterLike.stats.likes);
    }
    
  } catch (error) {
    console.error('❌ Error testing video likes:', error.response?.data || error.message);
  }
}

// Run the test
testVideoLikes();
