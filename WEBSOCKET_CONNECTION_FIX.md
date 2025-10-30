# 🔧 WebSocket Connection Fix for Next.js Integration

## ❌ The Problem

You're getting `Error: Invalid namespace` because of incorrect WebSocket URL configuration.

## ✅ The Solution

The issue is in how Socket.IO handles namespaces. When you have a namespace defined in your NestJS gateway like:

```typescript
@WebSocketGateway({
  namespace: '/messaging',
})
```

You need to connect from the client using the **base URL only**, and Socket.IO will automatically handle the namespace routing.

## 🔧 Fix Your useMessaging Hook

Update your `useMessaging` hook to use the correct WebSocket URL:

```typescript
// ❌ INCORRECT - Don't include the namespace in the URL
const newSocket = io('http://localhost:3001/messaging', {
  auth: { token }
})

// ✅ CORRECT - Use base URL only, Socket.IO handles the namespace
const newSocket = io('http://localhost:3001', {
  auth: { token }
})
```

## 📝 Updated Hook Configuration

Change this part in your `useMessaging` hook:

```typescript
export const useMessaging = (options: UseMessagingOptions = {}) => {
  const {
    token = '',
    baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
    // ❌ REMOVE /messaging from the WebSocket URL
    websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'
  } = options

  // ... rest of your hook
}
```

## 🌍 Environment Variables

Update your `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api

# ❌ INCORRECT
# NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001/messaging

# ✅ CORRECT - Base URL only
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001

# Other variables
NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE=10485760
NEXT_PUBLIC_JWT_TOKEN_KEY=lnk_auth_token
```

## 🎯 Alternative: Explicit Namespace Configuration

If you want to be explicit about the namespace, you can also do this:

```typescript
const newSocket = io('http://localhost:3001/messaging', {
  auth: { token },
  forceNew: true
})

// OR specify namespace separately
const newSocket = io('http://localhost:3001', {
  auth: { token },
  path: '/socket.io/', // Default Socket.IO path
  // The namespace '/messaging' is handled automatically by NestJS
})
```

## 🚀 Complete Fixed Hook

Here's the corrected version of your WebSocket initialization:

```typescript
// Initialize WebSocket connection
useEffect(() => {
  if (!token || !websocketUrl) return

  const currentTypingTimeout = typingTimeoutRef
  const currentReconnectTimeout = reconnectTimeoutRef

  // ✅ CORRECT: Use base URL, let Socket.IO handle the namespace
  const newSocket = io(websocketUrl, {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
    upgrade: true,
    timeout: 20000,
    // Add these for better connection handling
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  newSocket.on('connect', () => {
    console.log('Connected to messaging server')
    console.log('Socket ID:', newSocket.id)
    console.log('Namespace:', newSocket.nsp.name) // Should show '/messaging'
    setSocket(newSocket)
    setError(null)
  })

  // ... rest of your event handlers
}, [token, websocketUrl])
```

## 🔍 Debug Information

Add this debug code to verify the connection:

```typescript
newSocket.on('connect', () => {
  console.log('✅ Connected to messaging server')
  console.log('Socket ID:', newSocket.id)
  console.log('Namespace:', newSocket.nsp.name) // Should show '/messaging'
  console.log('Transport:', newSocket.io.engine.transport.name)
  setSocket(newSocket)
  setError(null)
})

newSocket.on('connect_error', (error: Error) => {
  console.error('❌ Connection error:', error)
  console.error('Error message:', error.message)
  console.error('Error description:', (error as any).description)
  setError('Connection failed. Please check your internet connection.')
})
```

## ✅ Testing the Fix

1. **Update your environment variable**:
   ```env
   NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
   ```

2. **Restart your Next.js development server**:
   ```bash
   npm run dev
   ```

3. **Check the browser console** - you should see:
   ```
   ✅ Connected to messaging server
   Socket ID: abc123...
   Namespace: /messaging
   Transport: websocket
   ```

4. **Test a WebSocket event**:
   ```typescript
   // This should work without errors
   socket?.emit('joinConversation', { conversationId: 'test-conv-id' })
   ```

## 🔧 Alternative Gateway Configuration

If you still have issues, you can also modify your NestJS gateway to not use a namespace:

```typescript
// In messaging.gateway.ts - Remove the namespace
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Remove this line: namespace: '/messaging',
})
```

Then connect directly to:
```typescript
const newSocket = io('http://localhost:3001', {
  auth: { token }
})
```

## 📋 Summary

The key fix is:
- ❌ **Don't use**: `http://localhost:3001/messaging`
- ✅ **Use**: `http://localhost:3001`
- Socket.IO automatically routes to the `/messaging` namespace defined in your NestJS gateway

This should resolve the "Invalid namespace" error! 🚀
