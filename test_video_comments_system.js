/**
 * Video Comments API Test Script
 * 
 * This script demonstrates how to use the video comments API endpoints.
 * Make sure to replace the BASE_URL, VIDEO_ID, and ACCESS_TOKEN with actual values.
 */

const BASE_URL = 'http://localhost:3000/api';
const VIDEO_ID = 'YOUR_VIDEO_ID_HERE';
const ACCESS_TOKEN = 'YOUR_JWT_TOKEN_HERE';

// Helper function to make API requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(ACCESS_TOKEN && { Authorization: `Bearer ${ACCESS_TOKEN}` }),
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    throw error;
  }
}

// Test the video comments API
async function testVideoCommentsAPI() {
  console.log('🎬 Testing Video Comments API...\n');

  try {
    // 1. Create a new comment
    console.log('1. Creating a new comment...');
    const newComment = await makeRequest(`/videos/${VIDEO_ID}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'This is a test comment! Great video! 🎉',
      }),
    });
    console.log('✅ Comment created:', newComment);
    const commentId = newComment.id;

    // 2. Get all comments for the video
    console.log('\n2. Getting all comments...');
    const comments = await makeRequest(`/videos/${VIDEO_ID}/comments?page=1&limit=10`);
    console.log('✅ Comments retrieved:', comments);

    // 3. Create a reply to the comment
    console.log('\n3. Creating a reply...');
    const reply = await makeRequest(`/videos/${VIDEO_ID}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'This is a reply to the comment! 💬',
        parentId: commentId,
      }),
    });
    console.log('✅ Reply created:', reply);
    const replyId = reply.id;

    // 4. Get replies for the comment
    console.log('\n4. Getting replies...');
    const replies = await makeRequest(`/videos/comments/${commentId}/replies?page=1&limit=10`);
    console.log('✅ Replies retrieved:', replies);

    // 5. Like the comment
    console.log('\n5. Liking the comment...');
    const likeResult = await makeRequest(`/videos/comments/${commentId}/like`, {
      method: 'POST',
    });
    console.log('✅ Comment liked:', likeResult);

    // 6. Unlike the comment (like again)
    console.log('\n6. Unliking the comment...');
    const unlikeResult = await makeRequest(`/videos/comments/${commentId}/like`, {
      method: 'POST',
    });
    console.log('✅ Comment unliked:', unlikeResult);

    // 7. Update the comment
    console.log('\n7. Updating the comment...');
    const updatedComment = await makeRequest(`/videos/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        content: 'This is an updated comment! 🔄',
      }),
    });
    console.log('✅ Comment updated:', updatedComment);

    // 8. Update the reply
    console.log('\n8. Updating the reply...');
    const updatedReply = await makeRequest(`/videos/comments/${replyId}`, {
      method: 'PUT',
      body: JSON.stringify({
        content: 'This is an updated reply! 🔄',
      }),
    });
    console.log('✅ Reply updated:', updatedReply);

    // 9. Delete the reply
    console.log('\n9. Deleting the reply...');
    const deleteReplyResult = await makeRequest(`/videos/comments/${replyId}`, {
      method: 'DELETE',
    });
    console.log('✅ Reply deleted:', deleteReplyResult);

    // 10. Delete the comment
    console.log('\n10. Deleting the comment...');
    const deleteCommentResult = await makeRequest(`/videos/comments/${commentId}`, {
      method: 'DELETE',
    });
    console.log('✅ Comment deleted:', deleteCommentResult);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test pagination
async function testPagination() {
  console.log('\n📄 Testing Pagination...\n');

  try {
    // Create multiple comments for testing
    const comments = [];
    for (let i = 1; i <= 5; i++) {
      const comment = await makeRequest(`/videos/${VIDEO_ID}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: `Test comment ${i} for pagination`,
        }),
      });
      comments.push(comment);
    }

    // Test pagination
    console.log('Testing page 1 (limit 3)...');
    const page1 = await makeRequest(`/videos/${VIDEO_ID}/comments?page=1&limit=3`);
    console.log('✅ Page 1:', page1);

    console.log('Testing page 2 (limit 3)...');
    const page2 = await makeRequest(`/videos/${VIDEO_ID}/comments?page=2&limit=3`);
    console.log('✅ Page 2:', page2);

    // Clean up test comments
    for (const comment of comments) {
      await makeRequest(`/videos/comments/${comment.id}`, {
        method: 'DELETE',
      });
    }

    console.log('\n🎉 Pagination tests completed successfully!');

  } catch (error) {
    console.error('❌ Pagination test failed:', error);
  }
}

// Test edge cases
async function testEdgeCases() {
  console.log('\n🔍 Testing Edge Cases...\n');

  try {
    // Test with invalid video ID
    console.log('Testing with invalid video ID...');
    try {
      await makeRequest('/videos/invalid-id/comments');
    } catch (error) {
      console.log('✅ Invalid video ID handled correctly:', error.message);
    }

    // Test creating comment without content
    console.log('Testing comment without content...');
    try {
      await makeRequest(`/videos/${VIDEO_ID}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: '',
        }),
      });
    } catch (error) {
      console.log('✅ Empty content handled correctly:', error.message);
    }

    // Test creating comment with content too long
    console.log('Testing comment with content too long...');
    try {
      await makeRequest(`/videos/${VIDEO_ID}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'a'.repeat(501), // 501 characters
        }),
      });
    } catch (error) {
      console.log('✅ Long content handled correctly:', error.message);
    }

    // Test updating non-existent comment
    console.log('Testing update of non-existent comment...');
    try {
      await makeRequest('/videos/comments/000000000000000000000000', {
        method: 'PUT',
        body: JSON.stringify({
          content: 'Updated content',
        }),
      });
    } catch (error) {
      console.log('✅ Non-existent comment handled correctly:', error.message);
    }

    console.log('\n🎉 Edge case tests completed successfully!');

  } catch (error) {
    console.error('❌ Edge case test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testVideoCommentsAPI();
  await testPagination();
  await testEdgeCases();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testVideoCommentsAPI,
    testPagination,
    testEdgeCases,
    runAllTests,
  };
}

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}
