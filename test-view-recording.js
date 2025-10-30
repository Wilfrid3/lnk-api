/**
 * Debug script to test view recording functionality
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const VIDEO_ID = '6872bf68091f8826c9fe51df'; // Use your video ID

async function testViewRecording() {
  console.log('🔍 Testing view recording functionality...\n');
  
  try {
    // 1. Get current video stats
    console.log('1. Getting current video stats...');
    const videoResponse = await fetch(`${BASE_URL}/videos/${VIDEO_ID}`);
    const videoData = await videoResponse.json();
    console.log('Current video stats:', videoData.stats);
    const initialViewCount = videoData.stats.views;
    
    // 2. Stream video to trigger view recording (without authentication)
    console.log('\n2. Streaming video (anonymous) to trigger view recording...');
    const streamResponse1 = await fetch(`${BASE_URL}/videos/${VIDEO_ID}/stream`, {
      headers: {
        'User-Agent': 'Test-Browser-1/1.0',
        'X-Forwarded-For': '192.168.1.100', // Simulate different IP
      }
    });
    
    if (streamResponse1.ok) {
      console.log('✅ First stream request successful');
    } else {
      console.log('❌ First stream request failed:', streamResponse1.status);
    }
    
    // Wait a bit for async view recording
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Check if view count increased
    console.log('\n3. Checking view count after first stream...');
    const videoResponse2 = await fetch(`${BASE_URL}/videos/${VIDEO_ID}`);
    const videoData2 = await videoResponse2.json();
    console.log('Video stats after first stream:', videoData2.stats);
    
    // 4. Stream video again with different User-Agent (simulate different device)
    console.log('\n4. Streaming video again with different User-Agent...');
    const streamResponse2 = await fetch(`${BASE_URL}/videos/${VIDEO_ID}/stream`, {
      headers: {
        'User-Agent': 'Test-Browser-2/2.0',
        'X-Forwarded-For': '192.168.1.101', // Simulate different IP
      }
    });
    
    if (streamResponse2.ok) {
      console.log('✅ Second stream request successful');
    } else {
      console.log('❌ Second stream request failed:', streamResponse2.status);
    }
    
    // Wait a bit for async view recording
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. Check final view count
    console.log('\n5. Checking final view count...');
    const videoResponse3 = await fetch(`${BASE_URL}/videos/${VIDEO_ID}`);
    const videoData3 = await videoResponse3.json();
    console.log('Final video stats:', videoData3.stats);
    
    const finalViewCount = videoData3.stats.views;
    const viewsAdded = finalViewCount - initialViewCount;
    
    console.log('\n📊 Summary:');
    console.log(`Initial views: ${initialViewCount}`);
    console.log(`Final views: ${finalViewCount}`);
    console.log(`Views added: ${viewsAdded}`);
    
    if (viewsAdded >= 1) {
      console.log('✅ View recording is working!');
    } else {
      console.log('❌ View recording may not be working properly');
    }
    
    // 6. Test with same User-Agent again (should not increment)
    console.log('\n6. Testing duplicate view (same User-Agent)...');
    const streamResponse3 = await fetch(`${BASE_URL}/videos/${VIDEO_ID}/stream`, {
      headers: {
        'User-Agent': 'Test-Browser-2/2.0',
        'X-Forwarded-For': '192.168.1.101', // Same IP as before
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const videoResponse4 = await fetch(`${BASE_URL}/videos/${VIDEO_ID}`);
    const videoData4 = await videoResponse4.json();
    console.log('Video stats after duplicate view:', videoData4.stats);
    
    if (videoData4.stats.views === finalViewCount) {
      console.log('✅ Duplicate view prevention is working!');
    } else {
      console.log('❌ Duplicate view was recorded (this might be an issue)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('📋 This script tests view recording by making stream requests');
console.log('Make sure your server is running on port 3001\n');

testViewRecording();
