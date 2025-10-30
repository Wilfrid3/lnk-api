# 📱 LNK API Messaging System Integration Guide for Next.js

This guide explains how to integrate the LNK API Messaging System into your Next.js application. The messaging system provides real-time chat functionality with service marketplace integration.

## 🏗️ System Overview

The messaging system consists of:
- **REST API**: HTTP endpoints for CRUD operations
- **WebSocket Gateway**: Real-time messaging with Socket.IO
- **File Upload**: Support for chat attachments
- **Service Integration**: Service offers and booking requests

**Base URL**: `http://localhost:3001/api`  
**WebSocket URL**: `http://localhost:3001/messaging`

## 🔐 Authentication

All endpoints require JWT authentication via the `Authorization` header:

```javascript
const headers = {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

## 📡 REST API Endpoints

### 1. Conversations

#### Get User Conversations
```http
GET /api/conversations?page=1&limit=20&search=text
```

**Query Parameters:**
```typescript
interface ConversationQuery {
  page?: number        // Default: 1
  limit?: number       // Default: 20, Max: 100
  search?: string      // Search in conversation names
  type?: 'direct' | 'group'
  archived?: boolean   // Include archived conversations
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "conv_123",
      "participants": [
        {
          "_id": "user_1",
          "name": "John Doe",
          "avatar": "https://example.com/avatar.jpg",
          "isOnline": true,
          "lastSeen": "2024-01-15T10:30:00Z"
        }
      ],
      "type": "direct",
      "lastMessage": "Hello, how are you?",
      "lastMessageAt": "2024-01-15T10:30:00Z",
      "unreadCount": 3,
      "isArchived": false,
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Create Conversation
```http
POST /api/conversations
```

**Payload:**
```json
{
  "participantIds": ["user_2"],
  "type": "direct"
}
```

**Note**: For direct conversations, you only need to specify the other participant. The current user is automatically added to make it exactly 2 participants.

**For group conversations:**
```json
{
  "participantIds": ["user_2", "user_3", "user_4"],
  "type": "group",
  "groupName": "Project Team",
  "groupAvatar": "https://example.com/group-avatar.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "conv_456",
    "participants": ["user_1", "user_2"],
    "type": "direct",
    "unreadCounts": {},
    "isActive": true,
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

#### Get Conversation Details
```http
GET /api/conversations/{conversationId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "conv_123",
    "participants": [
      {
        "_id": "user_1",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "servicePackages": [
          {
            "_id": "pkg_1",
            "name": "Web Development",
            "price": 500,
            "currency": "FCFA",
            "duration": "2 weeks"
          }
        ]
      }
    ],
    "type": "direct",
    "lastMessage": "Hello!",
    "lastMessageAt": "2024-01-15T10:30:00Z",
    "unreadCount": 2
  }
}
```

#### Archive/Unarchive Conversation
```http
PUT /api/conversations/{conversationId}/archive
PUT /api/conversations/{conversationId}/unarchive
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation archived successfully"
}
```

### 2. Messages

#### Get Conversation Messages
```http
GET /api/conversations/{conversationId}/messages?page=1&limit=50
```

**Query Parameters:**
```typescript
interface MessageQuery {
  page?: number        // Default: 1
  limit?: number       // Default: 50, Max: 100
  before?: string      // Message ID for pagination
  after?: string       // Message ID for pagination
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "msg_123",
      "conversationId": "conv_123",
      "senderId": {
        "_id": "user_1",
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "content": "Hello, how are you?",
      "type": "text",
      "metadata": null,
      "readBy": {
        "user_2": "2024-01-15T10:35:00Z"
      },
      "reactions": [
        {
          "userId": "user_2",
          "emoji": "👍",
          "createdAt": "2024-01-15T10:32:00Z"
        }
      ],
      "replyToId": null,
      "editedAt": null,
      "isForwarded": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Send Text Message
```http
POST /api/conversations/{conversationId}/messages
```

**Payload:**
```json
{
  "content": "Hello, how are you?",
  "replyToId": "msg_456",
  "isForwarded": false,
  "forwardedFromId": "msg_789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_789",
    "conversationId": "conv_123",
    "senderId": "user_1",
    "content": "Hello, how are you?",
    "type": "text",
    "readBy": {},
    "reactions": [],
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

#### Send Service Offer
```http
POST /api/conversations/{conversationId}/messages/service-offer
```

**Payload:**
```json
{
  "servicePackageId": "pkg_123",
  "customPrice": 400,
  "customDuration": "1 week",
  "note": "Special discount for you!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_890",
    "conversationId": "conv_123",
    "senderId": "user_1",
    "content": "Service proposé: Web Development",
    "type": "service_offer",
    "metadata": {
      "servicePackageId": "pkg_123",
      "serviceName": "Web Development",
      "price": 400,
      "currency": "FCFA",
      "duration": "1 week",
      "note": "Special discount for you!"
    },
    "createdAt": "2024-01-15T11:05:00Z"
  }
}
```

#### Send Booking Request
```http
POST /api/conversations/{conversationId}/messages/booking-request
```

**Payload:**
```json
{
  "servicePackageId": "pkg_123",
  "requestedDate": "2024-01-20",
  "requestedTime": "14:30",
  "note": "I would like to book this service"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_901",
    "type": "booking_request",
    "content": "Demande de réservation: Web Development",
    "metadata": {
      "servicePackageId": "pkg_123",
      "serviceName": "Web Development",
      "price": 500,
      "currency": "FCFA",
      "requestedDate": "2024-01-20T00:00:00.000Z",
      "requestedTime": "14:30",
      "note": "I would like to book this service"
    },
    "createdAt": "2024-01-15T11:10:00Z"
  }
}
```

#### Send Location Message
```http
POST /api/conversations/{conversationId}/messages/location
```

**Payload:**
```json
{
  "latitude": 14.6928,
  "longitude": -17.4467,
  "address": "Dakar, Senegal"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_912",
    "type": "location",
    "content": "📍 Location partagée",
    "metadata": {
      "latitude": 14.6928,
      "longitude": -17.4467,
      "address": "Dakar, Senegal"
    },
    "createdAt": "2024-01-15T11:15:00Z"
  }
}
```

#### Edit Message
```http
PUT /api/messages/{messageId}
```

**Payload:**
```json
{
  "content": "Updated message content"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_123",
    "content": "Updated message content",
    "editedAt": "2024-01-15T11:20:00Z"
  }
}
```

#### Add Message Reaction
```http
POST /api/messages/{messageId}/reaction
```

**Payload:**
```json
{
  "emoji": "👍"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_123",
    "reactions": [
      {
        "userId": "user_1",
        "emoji": "👍",
        "createdAt": "2024-01-15T11:25:00Z"
      }
    ]
  }
}
```

#### Mark Message as Read
```http
POST /api/messages/{messageId}/read
```

**Response:**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

#### Search Messages
```http
GET /api/messages/search?q=hello&limit=20&page=1
```

**Query Parameters:**
```typescript
interface SearchQuery {
  q: string           // Search query
  page?: number       // Default: 1
  limit?: number      // Default: 20
  type?: string       // Message type filter
  conversationId?: string  // Search within specific conversation
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "msg_123",
      "content": "Hello, how are you?",
      "conversationId": "conv_123",
      "senderId": {
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

### 3. File Upload

#### Upload Chat Files
```http
POST /api/upload/chat-files
```

**Content-Type**: `multipart/form-data`

**Form Data:**
```typescript
const formData = new FormData();
formData.append('file', file); // File object
formData.append('conversationId', 'conv_123'); // Optional
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "file_123",
    "fileName": "document.pdf",
    "fileUrl": "http://localhost:3001/upload/chat/document.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-15T11:30:00Z"
  }
}
```

**Supported File Types:**
- **Images**: JPG, JPEG, PNG, GIF, WebP
- **Videos**: MP4, MOV, AVI, MKV
- **Audio**: MP3, WAV, AAC, M4A
- **Documents**: PDF, DOC, DOCX, TXT, RTF
- **Max Size**: 10MB

## 🔌 WebSocket Integration

### Connection Setup

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001/messaging', {
  auth: {
    token: userToken
  },
  autoConnect: true
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to messaging server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from messaging server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Client → Server Events

#### Join Conversation
```javascript
socket.emit('joinConversation', {
  conversationId: 'conv_123'
});
```

#### Leave Conversation
```javascript
socket.emit('leaveConversation', {
  conversationId: 'conv_123'
});
```

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing', {
  conversationId: 'conv_123',
  typing: true
});

// Stop typing
socket.emit('typing', {
  conversationId: 'conv_123',
  typing: false
});
```

#### Mark as Read
```javascript
// Mark specific message
socket.emit('markAsRead', {
  conversationId: 'conv_123',
  messageId: 'msg_123'
});

// Mark all messages in conversation
socket.emit('markAsRead', {
  conversationId: 'conv_123'
});
```

#### Get Online Users
```javascript
socket.emit('getOnlineUsers', {
  conversationId: 'conv_123'
});
```

### Server → Client Events

#### New Message
```javascript
socket.on('newMessage', (data) => {
  console.log('New message received:', data);
  /*
  {
    message: {
      _id: 'msg_123',
      content: 'Hello!',
      senderId: 'user_1',
      type: 'text',
      createdAt: '2024-01-15T11:35:00Z'
    },
    conversationId: 'conv_123',
    senderId: 'user_1',
    timestamp: '2024-01-15T11:35:00Z'
  }
  */
});
```

#### Message Read Notification
```javascript
socket.on('messageRead', (data) => {
  console.log('Message read:', data);
  /*
  {
    conversationId: 'conv_123',
    messageId: 'msg_123',
    readBy: 'user_2',
    timestamp: '2024-01-15T11:36:00Z'
  }
  */
});
```

#### Typing Indicators
```javascript
socket.on('userTyping', (data) => {
  console.log('User typing:', data);
  /*
  {
    userId: 'user_2',
    conversationId: 'conv_123',
    typing: true,
    timestamp: '2024-01-15T11:37:00Z'
  }
  */
});
```

#### User Online/Offline
```javascript
socket.on('userOnline', (data) => {
  console.log('User came online:', data);
  /*
  {
    userId: 'user_2',
    timestamp: '2024-01-15T11:38:00Z'
  }
  */
});

socket.on('userOffline', (data) => {
  console.log('User went offline:', data);
  /*
  {
    userId: 'user_2',
    timestamp: '2024-01-15T11:39:00Z'
  }
  */
});
```

#### Online Users List
```javascript
socket.on('onlineUsers', (data) => {
  console.log('Online users:', data);
  /*
  {
    conversationId: 'conv_123',
    onlineUsers: ['user_1', 'user_3'],
    timestamp: '2024-01-15T11:40:00Z'
  }
  */
});
```

## 🚀 Next.js Integration Examples

### 1. Custom Hook for Messaging

```typescript
// hooks/useMessaging.ts
import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface Message {
  _id: string;
  content: string;
  senderId: string;
  type: string;
  createdAt: string;
  metadata?: any;
}

interface Conversation {
  _id: string;
  participants: any[];
  lastMessage: string;
  unreadCount: number;
}

export const useMessaging = (token: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:3001/messaging', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to messaging server');
      setSocket(newSocket);
    });

    newSocket.on('newMessage', (data) => {
      setMessages(prev => ({
        ...prev,
        [data.conversationId]: [
          ...(prev[data.conversationId] || []),
          data.message
        ]
      }));
    });

    newSocket.on('userTyping', (data) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (data.typing) {
          updated.add(data.userId);
        } else {
          updated.delete(data.userId);
        }
        return updated;
      });
    });

    newSocket.on('userOnline', (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    });

    newSocket.on('userOffline', (data) => {
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });
    });

    return () => newSocket.close();
  }, [token]);

  // API functions
  const fetchConversations = useCallback(async () => {
    const response = await fetch('/api/conversations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setConversations(data.data);
  }, [token]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setMessages(prev => ({
      ...prev,
      [conversationId]: data.data
    }));
  }, [token]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    return response.json();
  }, [token]);

  const joinConversation = useCallback((conversationId: string) => {
    socket?.emit('joinConversation', { conversationId });
  }, [socket]);

  const startTyping = useCallback((conversationId: string) => {
    socket?.emit('typing', { conversationId, typing: true });
  }, [socket]);

  const stopTyping = useCallback((conversationId: string) => {
    socket?.emit('typing', { conversationId, typing: false });
  }, [socket]);

  return {
    socket,
    conversations,
    messages,
    typingUsers,
    onlineUsers,
    fetchConversations,
    fetchMessages,
    sendMessage,
    joinConversation,
    startTyping,
    stopTyping
  };
};
```

### 2. Chat Component

```typescript
// components/Chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../hooks/useMessaging';

interface ChatProps {
  conversationId: string;
  userToken: string;
}

export const Chat: React.FC<ChatProps> = ({ conversationId, userToken }) => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    messages,
    typingUsers,
    onlineUsers,
    sendMessage,
    joinConversation,
    startTyping,
    stopTyping,
    fetchMessages
  } = useMessaging(userToken);

  useEffect(() => {
    joinConversation(conversationId);
    fetchMessages(conversationId);
  }, [conversationId, joinConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[conversationId]]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      await sendMessage(conversationId, messageInput);
      setMessageInput('');
      
      if (isTyping) {
        stopTyping(conversationId);
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (!isTyping) {
      startTyping(conversationId);
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
      setIsTyping(false);
    }, 3000);
  };

  const conversationMessages = messages[conversationId] || [];

  return (
    <div className="chat-container">
      <div className="messages-container">
        {conversationMessages.map((message) => (
          <div key={message._id} className={`message ${message.senderId === 'currentUserId' ? 'sent' : 'received'}`}>
            <div className="message-content">
              {message.type === 'text' && <p>{message.content}</p>}
              {message.type === 'service_offer' && (
                <div className="service-offer">
                  <h4>🎯 Service Offer</h4>
                  <p><strong>{message.metadata.serviceName}</strong></p>
                  <p>Price: {message.metadata.price} {message.metadata.currency}</p>
                  <p>Duration: {message.metadata.duration}</p>
                  {message.metadata.note && <p>Note: {message.metadata.note}</p>}
                </div>
              )}
              {message.type === 'booking_request' && (
                <div className="booking-request">
                  <h4>📅 Booking Request</h4>
                  <p><strong>{message.metadata.serviceName}</strong></p>
                  <p>Date: {new Date(message.metadata.requestedDate).toLocaleDateString()}</p>
                  <p>Time: {message.metadata.requestedTime}</p>
                </div>
              )}
              {message.type === 'location' && (
                <div className="location-message">
                  <h4>📍 Location</h4>
                  <p>{message.metadata.address}</p>
                  <a 
                    href={`https://maps.google.com/?q=${message.metadata.latitude},${message.metadata.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Maps
                  </a>
                </div>
              )}
            </div>
            <span className="message-time">
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>
        ))}
        
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            Someone is typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" disabled={!messageInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};
```

### 3. Service Offer Component

```typescript
// components/ServiceOfferModal.tsx
import React, { useState } from 'react';

interface ServiceOfferModalProps {
  conversationId: string;
  userToken: string;
  servicePackages: any[];
  onClose: () => void;
  onSend: () => void;
}

export const ServiceOfferModal: React.FC<ServiceOfferModalProps> = ({
  conversationId,
  userToken,
  servicePackages,
  onClose,
  onSend
}) => {
  const [selectedPackage, setSelectedPackage] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [note, setNote] = useState('');

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/service-offer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          servicePackageId: selectedPackage,
          customPrice: customPrice ? parseFloat(customPrice) : undefined,
          customDuration: customDuration || undefined,
          note: note || undefined
        })
      });

      if (response.ok) {
        onSend();
        onClose();
      }
    } catch (error) {
      console.error('Failed to send service offer:', error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Send Service Offer</h3>
        
        <form onSubmit={handleSendOffer}>
          <div className="form-group">
            <label>Select Service Package:</label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              required
            >
              <option value="">Choose a service...</option>
              {servicePackages.map((pkg) => (
                <option key={pkg._id} value={pkg._id}>
                  {pkg.name} - {pkg.price} {pkg.currency}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Custom Price (optional):</label>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="Leave empty to use default price"
            />
          </div>

          <div className="form-group">
            <label>Custom Duration (optional):</label>
            <input
              type="text"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="e.g., 2 hours, 1 week"
            />
          </div>

          <div className="form-group">
            <label>Note (optional):</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a personal note..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={!selectedPackage}>Send Offer</button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 4. File Upload Component

```typescript
// components/FileUpload.tsx
import React, { useRef } from 'react';

interface FileUploadProps {
  conversationId: string;
  userToken: string;
  onUpload: (fileData: any) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  conversationId,
  userToken,
  onUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);

    try {
      const response = await fetch('/api/upload/chat-files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        onUpload(result.data);
        
        // Send file message
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: `📎 ${result.data.fileName}`,
            type: 'file',
            metadata: {
              fileName: result.data.fileName,
              fileUrl: result.data.fileUrl,
              fileSize: result.data.fileSize,
              mimeType: result.data.mimeType
            }
          })
        });
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.mkv,.mp3,.wav,.aac,.m4a,.pdf,.doc,.docx,.txt,.rtf"
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="file-upload-button"
      >
        📎 Attach File
      </button>
    </div>
  );
};
```

## 🔧 Environment Configuration

Add these environment variables to your Next.js `.env.local`:

```env
# LNK API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001/messaging
NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE=10485760

# Authentication
NEXT_PUBLIC_JWT_TOKEN_KEY=lnk_auth_token
```

## 🎯 Error Handling

```typescript
// utils/apiClient.ts
class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string) {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getConversations(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/conversations?${query}`);
  }

  async sendMessage(conversationId: string, data: any) {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Add other methods...
}

export default ApiClient;
```

## 📱 Mobile Considerations

For React Native or mobile web apps:

```typescript
// Mobile WebSocket configuration
const socket = io('http://localhost:3001/messaging', {
  auth: { token },
  transports: ['websocket', 'polling'], // Fallback for mobile networks
  upgrade: true,
  rememberUpgrade: true,
  timeout: 20000,
  forceNew: true
});

// Handle app state changes
import { AppState } from 'react-native';

AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    socket.connect();
  } else {
    socket.disconnect();
  }
});
```

## 🚀 Getting Started Checklist

1. **Install Dependencies**:
   ```bash
   npm install socket.io-client
   ```

2. **Configure Environment Variables**
3. **Implement Authentication** (JWT token management)
4. **Set up WebSocket Connection** using the `useMessaging` hook
5. **Create Chat Components** following the examples above
6. **Test Real-time Features** (typing indicators, message delivery)
7. **Implement File Upload** for media sharing
8. **Add Service Integration** for marketplace features

## 🔍 Testing

Use these endpoints to test the integration:

1. **Health Check**: `GET /api/health` - Verify API is running
2. **Auth Test**: `GET /api/conversations` - Test authentication
3. **WebSocket Test**: Connect and emit `joinConversation` event
4. **File Upload Test**: Upload a small image file

The messaging system is now ready for full integration into your Next.js application! 🚀
