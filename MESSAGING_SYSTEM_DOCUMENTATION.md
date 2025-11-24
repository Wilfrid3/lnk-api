# Realtime Messaging System Documentation

## Overview

The LNK API Realtime Messaging System provides comprehensive chat functionality with real-time WebSocket communication, service marketplace integration, and advanced features like read receipts, typing indicators, and file sharing.

## Features

### ✅ Core Messaging
- Real-time messaging with Socket.IO
- Direct and group conversations
- Message types: text, image, file, video, audio, service offers, booking requests, location
- Message pagination and infinite scroll
- Message editing and deletion
- Message reactions and emoji support

### ✅ Service Marketplace Integration
- Service offer messages using user's `servicePackages`
- Booking request messages with date/time preferences
- Automatic service details population (price, duration, etc.)
- Integration with existing user profiles

### ✅ Real-time Features
- Online/offline presence system
- Typing indicators with 10-second auto-expiration
- Read receipts (✓✓ indicators)
- Live message delivery
- Connection status tracking

### ✅ File Upload & Media
- Images: JPG, JPEG, PNG, GIF, WebP
- Videos: MP4, MOV, AVI, MKV
- Audio: MP3, WAV, AAC, M4A
- Documents: PDF, DOC, DOCX, TXT, RTF
- 10MB file size limit
- Automatic file type categorization

### ✅ Advanced Features
- Message search across all conversations
- Bulk mark as read
- Conversation archiving
- User blocking (delete for user)
- Message forwarding
- Reply to specific messages

## Database Schemas

### Conversation Schema
```typescript
interface Conversation {
  _id: ObjectId
  participants: ObjectId[] // User references
  type: 'direct' | 'group'
  groupName?: string
  groupAvatar?: string
  groupAdmin?: ObjectId
  lastMessage?: string
  lastMessageAt: Date
  unreadCounts: Map<string, number> // userId -> count
  isActive: boolean
  archivedBy: Map<string, Date>
  deletedBy: Map<string, Date>
  createdAt: Date
  updatedAt: Date
}
```

### Message Schema
```typescript
interface Message {
  _id: ObjectId
  conversationId: ObjectId
  senderId: ObjectId
  content: string
  type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'service_offer' | 'booking_request' | 'location' | 'system'
  metadata?: MessageMetadata
  readBy: Map<string, Date>
  reactions: ObjectId[]
  reactionTypes: Map<string, string>
  replyToId?: ObjectId
  editedAt?: Date
  deletedAt?: Date
  deletedFor: ObjectId[]
  isForwarded: boolean
  forwardedFromId?: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

### MessageMetadata Interface
```typescript
interface MessageMetadata {
  // Service-related
  servicePackageId?: string
  serviceName?: string
  price?: number
  currency?: string
  duration?: string
  
  // File/Media
  fileName?: string
  fileUrl?: string
  fileSize?: number
  mimeType?: string
  thumbnailUrl?: string
  
  // Location
  latitude?: number
  longitude?: number
  address?: string
  
  // Booking request
  requestedDate?: Date
  requestedTime?: string
}
```

## API Endpoints

### Conversations

```http
GET    /api/conversations                    # Get user's conversations
POST   /api/conversations                    # Create new conversation
GET    /api/conversations/:id               # Get conversation details
PUT    /api/conversations/:id               # Update conversation
PUT    /api/conversations/:id/archive       # Archive conversation
PUT    /api/conversations/:id/unarchive     # Unarchive conversation
DELETE /api/conversations/:id               # Delete conversation
GET    /api/conversations/:id/unread-count  # Get unread count
```

### Messages

```http
GET    /api/conversations/:id/messages                # Get paginated messages
POST   /api/conversations/:id/messages                # Send new message
POST   /api/conversations/:id/messages/service-offer  # Send service offer
POST   /api/conversations/:id/messages/booking-request # Send booking request
POST   /api/conversations/:id/messages/location       # Send location
POST   /api/conversations/:id/messages/bulk-mark-read # Mark multiple as read

GET    /api/messages/search                 # Search messages globally
GET    /api/messages/:id                    # Get message by ID
PUT    /api/messages/:id                    # Edit message
DELETE /api/messages/:id                    # Delete message
DELETE /api/messages/:id/for-me             # Delete for current user
POST   /api/messages/:id/read               # Mark as read
POST   /api/messages/:id/reaction           # Add reaction
DELETE /api/messages/:id/reaction           # Remove reaction
GET    /api/messages/:id/reads              # Get read receipts
```

### File Upload

```http
POST   /api/upload/chat-files              # Upload chat files
```

## WebSocket Events

### Client → Server Events

```typescript
// Connection management
'join_conversation'   { conversationId: string }
'leave_conversation'  { conversationId: string }

// Messaging
'send_message'       { conversationId: string, message: CreateMessageDto }
'mark_read'          { messageId: string, conversationId: string }

// Real-time features
'typing_start'       { conversationId: string }
'typing_stop'        { conversationId: string }
'user_online'        { isOnline: boolean, lastSeen?: Date }
```

### Server → Client Events

```typescript
// Message events
'message_received'    { message: Message, conversationId: string }
'new_message'         { conversationId: string, message: Message }
'message_updated'     { conversationId: string, message: Message }
'message_read'        { messageId: string, conversationId: string, readBy: string, readAt: Date }

// Conversation events
'new_conversation'    { conversation: Conversation }
'conversation_updated' { conversationId: string, lastMessage: string, lastMessageAt: Date }

// Typing events
'user_typing'         { conversationId: string, userId: string, isTyping: boolean, user?: UserInfo }

// Status events
'user_online_status'  { userId: string, isOnline: boolean, lastSeen: Date }
```

## Socket Event Notifications

The messaging system automatically sends real-time notifications for the following actions:

### 📨 New Message Events
- **Event**: `new_message`
- **Triggered**: When any message is created (text, service offer, booking request, location, etc.)
- **Recipients**: All participants in the conversation
- **Payload**: `{ conversationId: string, message: MessageDocument }`

### ✏️ Message Update Events  
- **Event**: `message_updated`
- **Triggered**: When a message is edited or modified
- **Recipients**: All participants in the conversation
- **Payload**: `{ conversationId: string, message: MessageDocument }`

### 💬 New Conversation Events
- **Event**: `new_conversation`
- **Triggered**: When a new conversation is created
- **Recipients**: All participants in the new conversation
- **Payload**: `{ conversation: ConversationDocument }`

### Event Flow Example
```typescript
// 1. User creates a message via REST API
POST /api/conversations/123/messages
{ "content": "Hello!", "type": "text" }

// 2. System automatically triggers socket event
→ new_message event sent to conversation:123 room
→ All participants receive the event in real-time

// 3. User updates the message  
PUT /api/messages/456
{ "content": "Hello there!" }

// 4. System triggers update event
→ message_updated event sent to conversation:123 room
→ All participants see the edited message
```

## Usage Examples

### Socket Event Testing

You can test all socket events using the provided test script:

```bash
# Test socket event notifications
node test_socket_events.js
```

**Expected Output:**
```bash
🧪 Testing Socket Event Notifications...

1. Logging in users...
✅ User user1@test.com logged in successfully
✅ User user2@test.com logged in successfully

2. Connecting WebSocket clients...
✅ Client 1 connected
✅ Client 2 connected

3. Creating new conversation...
✅ Conversation created: 507f1f77bcf86cd799439011
📝 Client 2 received new_conversation event

4. Sending message...
✅ Message sent: 507f1f77bcf86cd799439012  
💬 Client 1 received new_message event
💬 Client 2 received new_message event

5. Updating message...
✅ Message updated
✏️ Client 1 received message_updated event
✏️ Client 2 received message_updated event

🎉 Socket event test completed!
```

### JavaScript/Node.js Client

```javascript
const io = require('socket.io-client');

// Connect with JWT token
const socket = io('ws://localhost:3001/chat', {
  auth: { token: 'your-jwt-token' }
});

// Join a conversation
socket.emit('join_conversation', { conversationId: 'conv123' });

// Send a message
socket.emit('send_message', {
  conversationId: 'conv123',
  message: {
    content: 'Hello!',
    type: 'text'
  }
});

// Listen for new messages
socket.on('message_received', (data) => {
  console.log('New message:', data.message);
});

// Handle typing indicators
socket.on('user_typing', (data) => {
  if (data.isTyping) {
    console.log(`${data.user.name} is typing...`);
  }
});

// Send typing indicator
socket.emit('typing_start', { conversationId: 'conv123' });
setTimeout(() => {
  socket.emit('typing_stop', { conversationId: 'conv123' });
}, 3000);
```

### REST API Examples

```javascript
// Create a conversation
const conversation = await fetch('/api/conversations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    participants: ['user1', 'user2'],
    type: 'direct'
  })
});

// Send service offer
const serviceOffer = await fetch(`/api/conversations/${convId}/messages/service-offer`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    servicePackageId: 'service123',
    message: 'I would like to offer this service!'
  })
});

// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const upload = await fetch('/api/upload/chat-files', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: formData
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useMessaging = (token: string) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    const newSocket = io('/chat', { auth: { token } });
    
    newSocket.on('message_received', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (data.isTyping) {
          updated.add(data.userId);
        } else {
          updated.delete(data.userId);
        }
        return updated;
      });
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, [token]);

  const sendMessage = (conversationId: string, content: string) => {
    socket?.emit('send_message', {
      conversationId,
      message: { content, type: 'text' }
    });
  };

  const startTyping = (conversationId: string) => {
    socket?.emit('typing_start', { conversationId });
  };

  const stopTyping = (conversationId: string) => {
    socket?.emit('typing_stop', { conversationId });
  };

  return { socket, messages, typingUsers, sendMessage, startTyping, stopTyping };
};
```

## Service Integration

### Service Offer Messages

Service offers automatically populate from user's `servicePackages`:

```typescript
// Service offer with metadata
{
  "type": "service_offer",
  "content": "Service proposé: Massage Relaxant",
  "metadata": {
    "servicePackageId": "pkg123",
    "serviceName": "Massage Relaxant",
    "price": 80,
    "currency": "FCFA",
    "duration": "1 hour"
  }
}
```

### Booking Request Messages

```typescript
// Booking request with scheduling
{
  "type": "booking_request",
  "content": "Demande de réservation: Massage Relaxant",
  "metadata": {
    "servicePackageId": "pkg123",
    "serviceName": "Massage Relaxant",
    "price": 80,
    "currency": "FCFA",
    "requestedDate": "2024-02-15T00:00:00.000Z",
    "requestedTime": "14:30"
  }
}
```

## Performance & Scalability

### Database Indexes

```javascript
// Conversation indexes
{ participants: 1, updatedAt: -1 }
{ lastMessageAt: -1 }
{ type: 1 }
{ isActive: 1 }

// Message indexes
{ conversationId: 1, createdAt: -1 }
{ senderId: 1, createdAt: -1 }
{ 'metadata.servicePackageId': 1 }
{ type: 1 }
{ deletedAt: 1 }

// Compound indexes
{ conversationId: 1, deletedAt: 1, createdAt: -1 }
{ senderId: 1, type: 1, createdAt: -1 }
```

### Redis Usage

- Online status tracking: `user:{userId}:online`
- Last seen timestamps: `user:{userId}:last_seen`
- Typing indicators: `typing:{conversationId}:{userId}` (10s TTL)
- Connection management for Socket.IO scaling

### Pagination

- Messages: 50 per page (configurable, max 100)
- Conversations: 20 per page (configurable, max 100)
- Infinite scroll support with cursor-based pagination

## Security

### Authentication
- JWT token required for all endpoints
- WebSocket authentication via handshake
- User ownership validation on all operations

### Authorization
- Users can only access conversations they participate in
- Only message senders can edit/delete their messages
- Group admins have additional permissions
- File upload validation and size limits

### Rate Limiting
- 100 messages per hour per user (configurable)
- File upload: 10MB max size
- WebSocket connection limits

### Data Validation
- Input sanitization for XSS protection
- File type and size validation
- Message content length limits
- Participant validation

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `204 No Content`: Successful operation with no response body
- `400 Bad Request`: Invalid input or business logic violation
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File too large
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Unexpected server error

### WebSocket Error Handling

```typescript
// Client error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Server response format
{
  "success": false,
  "error": "Error message"
}
```

## Monitoring & Analytics

### Metrics Tracked

- Active WebSocket connections
- Messages sent per minute/hour
- File uploads per day
- User online/offline events
- Conversation creation rate
- Service offer conversion rate

### Health Checks

- WebSocket gateway health
- Redis connection status
- Database connection status
- File upload functionality

## Deployment

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lnk_db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./upload/chat/

# WebSocket
WEBSOCKET_PORT=3001
CORS_ORIGINS=http://localhost:3000,https://YamoHub.com
```

### Docker Configuration

```yaml
# docker-compose.yml
services:
  lnk-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/lnk_db
      - REDIS_HOST=redis
    volumes:
      - ./upload:/app/upload
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
```

### Nginx Configuration

```nginx
# nginx.conf for WebSocket support
server {
    listen 80;
    server_name api.YamoHub.com;

    location /chat {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /upload {
        alias /path/to/upload/directory;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Testing

### Unit Tests

```typescript
// conversation.service.spec.ts
describe('ConversationService', () => {
  it('should create direct conversation', async () => {
    const conversation = await service.create({
      participants: ['user1', 'user2'],
      type: 'direct'
    }, 'user1');
    
    expect(conversation.type).toBe('direct');
    expect(conversation.participants).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
// messaging.e2e-spec.ts
describe('Messaging E2E', () => {
  it('should send and receive messages via WebSocket', (done) => {
    // Test implementation
  });
});
```

## 🔧 Troubleshooting Socket Events

### Common Issues

#### 1. Events Not Received
**Problem**: Socket events not triggering on message creation/updates

**Solutions**:
- ✅ Verify WebSocket connection: `socket.connected === true`
- ✅ Check JWT token authentication in handshake
- ✅ Ensure client joined conversation room: `join_conversation` event
- ✅ Verify server logs for gateway errors

#### 2. Authentication Errors
**Problem**: "No token provided" or "Invalid token"

**Solutions**:
- ✅ Pass JWT in auth object: `{ auth: { token: 'jwt-here' } }`
- ✅ Check token expiration with `jwt.verify()`
- ✅ Ensure token includes required payload (`sub`, `id` fields)

#### 3. Missing Events
**Problem**: Some events work, others don't

**Solutions**:
- ✅ Check event names match exactly: `new_message`, `message_updated`, `new_conversation`
- ✅ Verify conversation room membership with WebSocket inspector
- ✅ Test with multiple clients to confirm broadcasting

#### 4. Namespace Issues  
**Problem**: Connection fails or wrong namespace

**Solutions**:
- ✅ Connect to correct namespace: `io('http://localhost:3001/chat')`
- ✅ Remove `/messaging` from URL (gateway uses `/chat` namespace)
- ✅ Check CORS settings allow your client origin

### Debug Commands
```bash
# Check server logs
npm run start:dev

# Test socket connection
node test_socket_events.js

# Monitor Redis for typing/presence
redis-cli monitor

# Check MongoDB for messages
db.messages.find().sort({createdAt: -1}).limit(5)
```

### Event Verification Checklist
- [ ] ✅ Server running on correct port (3001)
- [ ] ✅ WebSocket gateway loaded (`MessagingGateway subscribed` logs)
- [ ] ✅ Client connected with valid JWT token
- [ ] ✅ Client joined conversation room
- [ ] ✅ Message created via REST API
- [ ] ✅ Socket event received by all conversation participants

---

## 📊 Performance Notes

- **Redis**: Used for typing indicators and online presence (auto-expiring keys)
- **Room Management**: Efficient broadcasting to conversation participants only
- **Connection Pooling**: WebSocket connections reused across requests
- **Event Throttling**: Typing events auto-expire after 10 seconds

For more details, see the [complete API reference](./API_REFERENCE.md) and [deployment guide](./DEPLOYMENT.md).
    const client = io('http://localhost:3001/chat', {
      auth: { token: validToken }
    });

    client.emit('send_message', {
      conversationId: 'test-conv',
      message: { content: 'Test message', type: 'text' }
    });

    client.on('message_received', (data) => {
      expect(data.message.content).toBe('Test message');
      done();
    });
  });
});
```

## Future Enhancements

### Planned Features

1. **Push Notifications**
   - FCM integration for mobile apps
   - Email notifications for offline users
   - Notification preferences

2. **Advanced Media**
   - Image compression and thumbnails
   - Video transcoding
   - Voice message recording
   - Screen sharing

3. **Enhanced Security**
   - End-to-end encryption
   - Message self-destruct timers
   - User blocking and reporting
   - Content moderation

4. **Business Features**
   - Message templates
   - Auto-responses
   - Conversation analytics
   - CRM integration

5. **Mobile Optimization**
   - Offline message queuing
   - Background sync
   - Push notification handling
   - Media optimization

### Performance Improvements

- Message caching with Redis
- CDN integration for file uploads
- Database sharding for large scale
- Microservices architecture
- Load balancing for WebSocket connections

## Support

For technical support or questions about the messaging system:

- Check the API documentation at `/api/docs`
- Review error logs in the application
- Test WebSocket connections using browser developer tools
- Monitor Redis and MongoDB health status

## Changelog

### v1.0.0 (Initial Release)
- ✅ Real-time messaging with Socket.IO
- ✅ Direct and group conversations
- ✅ Service marketplace integration
- ✅ File upload support
- ✅ Read receipts and typing indicators
- ✅ Message reactions and replies
- ✅ Comprehensive REST API
- ✅ WebSocket gateway with authentication
- ✅ Redis integration for online status
- ✅ Database indexing for performance
