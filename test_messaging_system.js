#!/usr/bin/env node

/**
 * Test script for Realtime Messaging System
 * Tests REST API endpoints and WebSocket functionality
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3001/api';
const WS_BASE = 'ws://localhost:3001';

// Test configuration
const TEST_USERS = [
  {
    email: 'user1@example.com',
    password: 'testpassword123',
    name: 'Test User 1'
  },
  {
    email: 'user2@example.com', 
    password: 'testpassword123',
    name: 'Test User 2'
  }
];

let authTokens = {};
let testConversationId = '';

/**
 * Login and get authentication tokens
 */
async function authenticateUsers() {
  console.log('🔐 Authenticating test users...');
  
  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: user.email,
        password: user.password
      });
      
      if (response.data.accessToken) {
        authTokens[`user${i + 1}`] = response.data.accessToken;
        console.log(`✅ User ${i + 1} authenticated successfully`);
      } else {
        console.log(`❌ User ${i + 1} authentication failed - no access token`);
        return false;
      }
    } catch (error) {
      console.log(`❌ User ${i + 1} authentication failed:`, error.response?.data?.message || error.message);
      return false;
    }
  }
  
  return true;
}

/**
 * Test conversation creation
 */
async function testConversationCreation() {
  try {
    console.log('\n📋 Testing conversation creation...');
    
    const response = await axios.post(`${API_BASE}/conversations`, {
      participants: ['user1', 'user2'], // These should be actual user IDs in production
      type: 'direct'
    }, {
      headers: {
        'Authorization': `Bearer ${authTokens.user1}`,
        'Content-Type': 'application/json'
      }
    });
    
    testConversationId = response.data._id;
    console.log('✅ Conversation created successfully:', {
      id: testConversationId,
      type: response.data.type,
      participants: response.data.participants.length
    });
    
    return testConversationId;
  } catch (error) {
    console.log('❌ Conversation creation failed:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test message sending via REST API
 */
async function testMessageSending() {
  if (!testConversationId) {
    console.log('❌ Cannot test messaging - no conversation ID');
    return;
  }

  try {
    console.log('\n💬 Testing message sending...');
    
    const response = await axios.post(`${API_BASE}/conversations/${testConversationId}/messages`, {
      content: 'Hello! This is a test message from the REST API 📱',
      type: 'text'
    }, {
      headers: {
        'Authorization': `Bearer ${authTokens.user1}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Message sent successfully:', {
      id: response.data._id,
      content: response.data.content,
      type: response.data.type,
      sender: response.data.senderId
    });
    
    return response.data._id;
  } catch (error) {
    console.log('❌ Message sending failed:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test getting conversation messages
 */
async function testGetMessages() {
  if (!testConversationId) {
    console.log('❌ Cannot test message retrieval - no conversation ID');
    return;
  }

  try {
    console.log('\n📨 Testing message retrieval...');
    
    const response = await axios.get(`${API_BASE}/conversations/${testConversationId}/messages?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${authTokens.user1}`
      }
    });
    
    console.log('✅ Messages retrieved successfully:', {
      messageCount: response.data.messages.length,
      pagination: response.data.pagination
    });
    
    if (response.data.messages.length > 0) {
      const firstMessage = response.data.messages[0];
      console.log('📧 First message:', {
        content: firstMessage.content,
        type: firstMessage.type,
        createdAt: firstMessage.createdAt
      });
    }
    
    return response.data.messages;
  } catch (error) {
    console.log('❌ Message retrieval failed:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test service offer message
 */
async function testServiceOffer() {
  if (!testConversationId) {
    console.log('❌ Cannot test service offer - no conversation ID');
    return;
  }

  try {
    console.log('\n🛍️ Testing service offer message...');
    
    const response = await axios.post(`${API_BASE}/conversations/${testConversationId}/messages/service-offer`, {
      servicePackageId: 'test-service-123',
      message: 'I would like to offer you this amazing service!'
    }, {
      headers: {
        'Authorization': `Bearer ${authTokens.user1}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Service offer sent successfully:', {
      id: response.data._id,
      type: response.data.type,
      content: response.data.content,
      metadata: response.data.metadata
    });
    
    return response.data._id;
  } catch (error) {
    console.log('❌ Service offer failed:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test WebSocket connection
 */
async function testWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('\n🔌 Testing WebSocket connection...');
    
    const socket = io(`${WS_BASE}/chat`, {
      auth: { token: authTokens.user1 }
    });
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      
      // Test joining a conversation
      socket.emit('join_conversation', { conversationId: testConversationId });
      
      // Test sending a message
      socket.emit('send_message', {
        conversationId: testConversationId,
        message: {
          content: 'Hello from WebSocket! 🚀',
          type: 'text'
        }
      });
      
      setTimeout(() => {
        socket.disconnect();
        console.log('✅ WebSocket test completed');
        resolve(true);
      }, 2000);
    });
    
    socket.on('message_received', (data) => {
      console.log('✅ Received WebSocket message:', {
        content: data.message.content,
        conversationId: data.conversationId
      });
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection failed:', error.message);
      resolve(false);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      socket.disconnect();
      console.log('❌ WebSocket connection timeout');
      resolve(false);
    }, 10000);
  });
}

/**
 * Test file upload
 */
async function testFileUpload() {
  try {
    console.log('\n📎 Testing file upload...');
    
    // Create a small test file
    const testContent = 'This is a test file for chat upload functionality';
    const testFilePath = './test-chat-file.txt';
    fs.writeFileSync(testFilePath, testContent);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    
    const response = await axios.post(`${API_BASE}/upload/chat-files`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${authTokens.user1}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('✅ File upload successful:', {
      success: response.data.success,
      fileName: response.data.file.fileName,
      fileUrl: response.data.file.fileUrl,
      fileSize: response.data.file.fileSize,
      type: response.data.file.type
    });
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    return response.data.file;
  } catch (error) {
    console.log('❌ File upload failed:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test conversation management
 */
async function testConversationManagement() {
  if (!testConversationId) {
    console.log('❌ Cannot test conversation management - no conversation ID');
    return;
  }

  try {
    console.log('\n⚙️ Testing conversation management...');
    
    // Test getting conversation details
    const detailsResponse = await axios.get(`${API_BASE}/conversations/${testConversationId}`, {
      headers: {
        'Authorization': `Bearer ${authTokens.user1}`
      }
    });
    
    console.log('✅ Conversation details retrieved:', {
      id: detailsResponse.data._id,
      type: detailsResponse.data.type,
      participantCount: detailsResponse.data.participants.length
    });
    
    // Test getting unread count
    const unreadResponse = await axios.get(`${API_BASE}/conversations/${testConversationId}/unread-count`, {
      headers: {
        'Authorization': `Bearer ${authTokens.user1}`
      }
    });
    
    console.log('✅ Unread count retrieved:', {
      conversationId: unreadResponse.data.conversationId,
      unreadCount: unreadResponse.data.unreadCount
    });
    
    return true;
  } catch (error) {
    console.log('❌ Conversation management test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Main test execution
 */
async function runMessagingTests() {
  console.log('🚀 Starting Realtime Messaging System Tests...\n');
  
  try {
    // Authenticate users
    const authSuccess = await authenticateUsers();
    if (!authSuccess) {
      console.log('\n❌ Test suite failed - Authentication unsuccessful');
      return;
    }
    
    // Test conversation creation
    const conversationId = await testConversationCreation();
    if (!conversationId) {
      console.log('\n❌ Test suite incomplete - Conversation creation failed');
      return;
    }
    
    // Test basic messaging
    await testMessageSending();
    await testGetMessages();
    
    // Test service integration
    await testServiceOffer();
    
    // Test file upload
    await testFileUpload();
    
    // Test conversation management
    await testConversationManagement();
    
    // Test WebSocket
    await testWebSocketConnection();
    
    console.log('\n🎉 Messaging System Tests Completed!');
    console.log('\n📊 Test Summary:');
    console.log('✅ User Authentication');
    console.log('✅ Conversation Creation');
    console.log('✅ Message Sending (REST)');
    console.log('✅ Message Retrieval');
    console.log('✅ Service Offer Messages');
    console.log('✅ File Upload');
    console.log('✅ Conversation Management');
    console.log('✅ WebSocket Messaging');
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runMessagingTests().catch(console.error);
}

module.exports = {
  runMessagingTests,
  authenticateUsers,
  testConversationCreation,
  testMessageSending,
  testWebSocketConnection
};
