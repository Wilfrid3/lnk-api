/**
 * Test script to verify video comment count functionality
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const VIDEO_ID = '6872bf68091f8826c9fe51df'; // Use the video ID from your database
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with a valid JWT token

async function testCommentCount() {
  console.log('🧪 Testing video comment count functionality...\n');
  
  try {
    // 1. Get current video stats
    console.log('1. Getting current video stats...');
    const videoResponse = await fetch(`${BASE_URL}/videos/${VIDEO_ID}`);
    const videoData = await videoResponse.json();
    console.log('Current video stats:', videoData.stats);
    const initialCommentCount = videoData.stats.comments;
    
    // 2. Create a test comment
    console.log('\n2. Creating a test comment...');
    const createCommentResponse = await fetch(`${BASE_URL}/videos/${VIDEO_ID}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify({
        content: 'Test comment for count verification!'
      })
    });
    
    if (!createCommentResponse.ok) {
      throw new Error(`Failed to create comment: ${createCommentResponse.status} ${createCommentResponse.statusText}`);
    }
    
    const commentData = await createCommentResponse.json();
    console.log('✅ Comment created:', commentData);
    
    // 3. Get updated video stats
    console.log('\n3. Getting updated video stats...');
    const updatedVideoResponse = await fetch(`${BASE_URL}/videos/${VIDEO_ID}`);
    const updatedVideoData = await updatedVideoResponse.json();
    console.log('Updated video stats:', updatedVideoData.stats);
    const newCommentCount = updatedVideoData.stats.comments;
    
    // 4. Verify count increased
    if (newCommentCount === initialCommentCount + 1) {
      console.log('✅ Comment count increased correctly!');
      console.log(`Initial count: ${initialCommentCount}, New count: ${newCommentCount}`);
    } else {
      console.log('❌ Comment count did not increase correctly');
      console.log(`Initial count: ${initialCommentCount}, New count: ${newCommentCount}`);
    }
    
    // 5. Get video feed to verify comment count there too
    console.log('\n4. Checking video feed for comment count...');
    const feedResponse = await fetch(`${BASE_URL}/videos/feed`);
    const feedData = await feedResponse.json();
    const videoInFeed = feedData.videos.find(v => v.id === VIDEO_ID);
    
    if (videoInFeed) {
      console.log('Video in feed stats:', videoInFeed.stats);
      if (videoInFeed.stats.comments === newCommentCount) {
        console.log('✅ Comment count in feed matches!');
      } else {
        console.log('❌ Comment count in feed does not match');
      }
    } else {
      console.log('❌ Video not found in feed');
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 Before running this test:');
console.log('1. Make sure your server is running on port 3001');
console.log('2. Replace JWT_TOKEN with a valid token');
console.log('3. Make sure the VIDEO_ID exists in your database');
console.log('4. Run: node test-comment-count.js\n');

// Run test if JWT token is provided
if (JWT_TOKEN !== 'YOUR_JWT_TOKEN_HERE') {
  testCommentCount();
} else {
  console.log('⚠️  Please update the JWT_TOKEN in the script before running the test');
}
