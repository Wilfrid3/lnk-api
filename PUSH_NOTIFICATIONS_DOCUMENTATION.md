# Push Notifications System Documentation

## Overview
This is a complete push notifications system implementation for the LNK API using web-push and MongoDB.

## Features
- ✅ User subscription management
- ✅ Push notification sending with web-push
- ✅ Batch notifications to multiple users
- ✅ Invalid subscription handling (automatic cleanup)
- ✅ Admin-only notification sending
- ✅ Predefined notification types (welcome, message, like, comment)
- ✅ Comprehensive error handling and logging
- ✅ RESTful API endpoints with Swagger documentation

## Required Environment Variables

Add these variables to your `.env` file:

```env
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_EMAIL=your_email@example.com
```

## Generating VAPID Keys

You can generate VAPID keys using the web-push library:

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
=======================================
Public Key:
BAdXhdGDgXJeJadxabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ...

Private Key:
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890...
=======================================
```

## API Endpoints

### Authentication Required
All endpoints require JWT authentication via Bearer token.

### User Endpoints

#### Subscribe to Push Notifications
```http
POST /notifications/subscribe
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BKxX...",
    "auth": "abc123..."
  },
  "userAgent": "Mozilla/5.0..."
}
```

#### Unsubscribe from Push Notifications
```http
POST /notifications/unsubscribe
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..." // Optional: specific endpoint
}
```

#### Get User's Active Subscriptions
```http
GET /notifications/subscriptions
Authorization: Bearer {jwt_token}
```

#### Get Subscriptions Count
```http
GET /notifications/subscriptions/count
Authorization: Bearer {jwt_token}
```

#### Send Test Welcome Notification
```http
POST /notifications/test/welcome
Authorization: Bearer {jwt_token}
```

### Admin Endpoints

#### Send Custom Notification (Admin Only)
```http
POST /notifications/send
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "title": "New Feature Available!",
  "body": "Check out our latest update with improved messaging.",
  "url": "/updates",
  "userIds": ["user123", "user456"], // Optional: specific users
  "icon": "/icons/feature-icon.png", // Optional
  "badge": "/icons/badge.png" // Optional
}
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

## Service Methods

The `NotificationsService` provides these methods for integration with other modules:

```typescript
// Subscribe user to notifications
await notificationsService.subscribe(userId, subscribeDto);

// Unsubscribe user
await notificationsService.unsubscribe(userId, unsubscribeDto);

// Send custom notification
await notificationsService.sendNotification(sendNotificationDto);

// Predefined notification types
await notificationsService.sendWelcomeNotification(userId);
await notificationsService.sendMessageNotification(receiverUserId, senderName, messagePreview);
await notificationsService.sendLikeNotification(postOwnerId, likerName, postTitle);
await notificationsService.sendCommentNotification(postOwnerId, commenterName, commentPreview, postTitle);

// Utility methods
await notificationsService.getActiveSubscriptionsCount(userId);
await notificationsService.getUserSubscriptions(userId);
await notificationsService.cleanupInactiveSubscriptions();
```

## Database Schema

### PushSubscription Collection
```typescript
{
  _id: ObjectId,
  userId: string,           // Reference to User
  endpoint: string,         // Push notification endpoint
  p256dh: string,          // Encryption key
  auth: string,            // Authentication key
  userAgent?: string,      // Browser info
  isActive: boolean,       // Default: true
  lastUsed: Date,          // Last notification sent
  createdAt: Date,         // Auto-generated
  updatedAt: Date          // Auto-generated
}
```

### Indexes
- Compound unique index on `userId` + `endpoint`
- Index on `userId` for efficient user queries
- Index on `isActive` for filtering

## Integration Examples

### In User Registration
```typescript
// After user registration
await this.notificationsService.sendWelcomeNotification(newUser._id);
```

### In Messaging System
```typescript
// When a message is sent
await this.notificationsService.sendMessageNotification(
  receiverId,
  senderName,
  messageText
);
```

### In Posts/Videos System
```typescript
// When someone likes a post
await this.notificationsService.sendLikeNotification(
  post.authorId,
  likerName,
  post.title
);

// When someone comments
await this.notificationsService.sendCommentNotification(
  post.authorId,
  commenterName,
  comment.text,
  post.title
);
```

## Frontend Integration

### Service Worker Registration
```javascript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Subscribe to Notifications
```javascript
async function subscribeToNotifications() {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
  });

  // Send subscription to your API
  await fetch('/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
      },
      userAgent: navigator.userAgent
    })
  });
}
```

### Service Worker (sw.js)
```javascript
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/icons/default-icon.png',
      badge: data.badge || '/icons/default-badge.png',
      data: {
        url: data.url
      },
      actions: [
        {
          action: 'open',
          title: 'Open'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

## Security Features

1. **JWT Authentication**: All endpoints require valid JWT tokens
2. **Admin Guard**: Notification sending restricted to admin users
3. **User Isolation**: Users can only manage their own subscriptions
4. **Input Validation**: All DTOs use class-validator for data validation
5. **Automatic Cleanup**: Invalid subscriptions are automatically deactivated

## Error Handling

- **Invalid Subscriptions**: Automatically detected and deactivated (HTTP 410/404)
- **Network Errors**: Gracefully handled with retry logic
- **Validation Errors**: Comprehensive input validation with descriptive messages
- **Authentication Errors**: Proper HTTP status codes and error messages

## Monitoring and Maintenance

### Cleanup Script
Run periodically to remove old inactive subscriptions:
```typescript
await notificationsService.cleanupInactiveSubscriptions();
```

### Monitoring
- Check notification success/failure rates
- Monitor active subscription counts
- Log invalid subscriptions for analysis

## Testing

Test the system using the provided endpoints:

1. Subscribe to notifications via `/notifications/subscribe`
2. Send test notification via `/notifications/test/welcome`
3. Check subscription count via `/notifications/subscriptions/count`
4. Unsubscribe via `/notifications/unsubscribe`

## Troubleshooting

### Common Issues

1. **VAPID Keys Not Working**: Ensure keys are properly generated and configured
2. **Notifications Not Received**: Check browser permissions and service worker registration
3. **Invalid Subscriptions**: Normal behavior - subscriptions become invalid when users change browsers/devices
4. **Admin Access Denied**: Ensure user has admin privileges in the database

### Logs
Monitor the application logs for notification sending status and error details.
