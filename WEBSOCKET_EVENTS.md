# WebSocket Events Documentation

This document describes the real-time events available in the messaging system via Socket.IO.

## Connection Setup

Connect to the WebSocket server using the `/chat` namespace:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

## 📥 Events to Listen For

### 1. `new_message`
Triggered when a new message is created in a conversation.

**Payload:**
```typescript
{
  conversationId: string,
  message: {
    _id: string,
    senderId: string,
    content: string,
    type: string,
    createdAt: Date,
    // ... other message properties
  }
}
```

### 2. `message_updated`
Triggered when a message is edited or updated.

**Payload:**
```typescript
{
  conversationId: string,
  message: {
    _id: string,
    senderId: string,
    content: string,
    editedAt: Date,
    // ... other message properties
  }
}
```

### 3. `new_conversation`
Triggered when a user is added to a new conversation.

**Payload:**
```typescript
{
  conversation: {
    _id: string,
    type: string,
    participants: string[],
    groupName?: string,
    // ... other conversation properties
  }
}
```

### 4. `message_received`
Real-time message delivery notification.

**Payload:**
```typescript
{
  message: MessageObject,
  conversationId: string
}
```

### 5. `user_typing`
Typing indicator updates.

**Payload:**
```typescript
{
  conversationId: string,
  userId: string,
  isTyping: boolean,
  user?: {
    id: string,
    name: string,
    avatar: string
  }
}
```

### 6. `message_read`
Message read receipt notifications.

**Payload:**
```typescript
{
  messageId: string,
  conversationId: string,
  readBy: string,
  readAt: Date
}
```

### 7. `user_online_status`
User online/offline status updates.

**Payload:**
```typescript
{
  userId: string,
  isOnline: boolean,
  lastSeen: Date
}
```

### 8. `conversation_updated`
Conversation metadata changes.

**Payload:**
```typescript
{
  conversationId: string,
  lastMessage: string,
  lastMessageAt: Date
}
```

## 📤 Events to Emit

### 1. `join_conversation`
Join a conversation room to receive its messages.

**Payload:**
```typescript
{ conversationId: string }
```

**Response:**
```typescript
{ success: boolean, error?: string }
```

### 2. `leave_conversation`
Leave a conversation room.

**Payload:**
```typescript
{ conversationId: string }
```

**Response:**
```typescript
{ success: boolean, error?: string }
```

### 3. `send_message`
Send a new message to a conversation.

**Payload:**
```typescript
{
  conversationId: string,
  message: {
    content: string,
    type: string,
    // ... other message properties
  }
}
```

**Response:**
```typescript
{ success: boolean, message?: MessageObject, error?: string }
```

### 4. `typing_start`
Indicate that the user started typing.

**Payload:**
```typescript
{ conversationId: string }
```

**Response:**
```typescript
{ success: boolean, error?: string }
```

### 5. `typing_stop`
Indicate that the user stopped typing.

**Payload:**
```typescript
{ conversationId: string }
```

**Response:**
```typescript
{ success: boolean, error?: string }
```

### 6. `mark_read`
Mark a message as read.

**Payload:**
```typescript
{
  messageId: string,
  conversationId: string
}
```

**Response:**
```typescript
{ success: boolean, error?: string }
```

### 7. `user_online`
Update user's online status.

**Payload:**
```typescript
{
  isOnline: boolean,
  lastSeen?: Date
}
```

**Response:**
```typescript
{ success: boolean, error?: string }
```

## 🔐 Authentication

All WebSocket connections require JWT authentication. Pass the token in the connection options:

```javascript
const socket = io('http://localhost:3001/chat', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

## 📝 Usage Example

```javascript
import { io } from 'socket.io-client';

// Connect to the chat namespace
const socket = io('http://localhost:3001/chat', {
  auth: {
    token: localStorage.getItem('jwt_token')
  }
});

// Listen for new messages
socket.on('new_message', ({ conversationId, message }) => {
  console.log('New message in conversation:', conversationId);
  // Update your UI with the new message
});

// Listen for typing indicators
socket.on('user_typing', ({ conversationId, userId, isTyping }) => {
  if (isTyping) {
    console.log(`User ${userId} is typing in ${conversationId}`);
  } else {
    console.log(`User ${userId} stopped typing in ${conversationId}`);
  }
});

// Join a conversation
socket.emit('join_conversation', { conversationId: 'conv123' });

// Send a message
socket.emit('send_message', {
  conversationId: 'conv123',
  message: {
    content: 'Hello world!',
    type: 'text'
  }
});

// Start typing
socket.emit('typing_start', { conversationId: 'conv123' });

// Stop typing after a delay
setTimeout(() => {
  socket.emit('typing_stop', { conversationId: 'conv123' });
}, 3000);
```

## 🏗️ Room Structure

The WebSocket server uses the following room naming convention:

- `user:{userId}` - Personal room for each user
- `conversation:{conversationId}` - Room for each conversation

Users are automatically joined to:
1. Their personal room upon connection
2. All conversation rooms they participate in

## 🚀 Automatic Features

Upon connection, the server automatically:
- Verifies JWT authentication
- Joins user to their personal room
- Joins user to all their conversation rooms
- Updates their online status
- Broadcasts their online status to other users

Upon disconnection, the server automatically:
- Updates their offline status
- Stops all typing indicators
- Broadcasts their offline status to other users
- Cleans up connection mappings
