# Integration Examples for Push Notifications

This document shows how to integrate the push notifications system with other modules in your application.

## 1. Messaging System Integration

### In your messaging service:

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagingService {
  constructor(
    private readonly notificationsService: NotificationsService,
    // ... other dependencies
  ) {}

  async sendMessage(senderId: string, receiverId: string, messageText: string) {
    // Your existing message sending logic
    const message = await this.createMessage(senderId, receiverId, messageText);
    
    // Get sender information for notification
    const sender = await this.usersService.findById(senderId);
    
    // Send push notification to receiver
    try {
      await this.notificationsService.sendMessageNotification(
        receiverId,
        sender.name || 'Someone',
        messageText
      );
    } catch (error) {
      // Log error but don't fail the message sending
      console.error('Failed to send message notification:', error);
    }
    
    return message;
  }
}
```

### In your messaging module:

```typescript
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';

@Module({
  imports: [
    NotificationsModule, // Import notifications module
    // ... other imports
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
```

## 2. Posts/Videos System Integration

### In your posts service:

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly notificationsService: NotificationsService,
    // ... other dependencies
  ) {}

  async likePost(postId: string, userId: string) {
    // Your existing like logic
    const post = await this.findPostById(postId);
    const like = await this.createLike(postId, userId);
    
    // Don't send notification if user likes their own post
    if (post.authorId !== userId) {
      try {
        const liker = await this.usersService.findById(userId);
        await this.notificationsService.sendLikeNotification(
          post.authorId,
          liker.name || 'Someone',
          post.title || 'your post'
        );
      } catch (error) {
        console.error('Failed to send like notification:', error);
      }
    }
    
    return like;
  }

  async addComment(postId: string, userId: string, commentText: string) {
    // Your existing comment logic
    const post = await this.findPostById(postId);
    const comment = await this.createComment(postId, userId, commentText);
    
    // Don't send notification if user comments on their own post
    if (post.authorId !== userId) {
      try {
        const commenter = await this.usersService.findById(userId);
        await this.notificationsService.sendCommentNotification(
          post.authorId,
          commenter.name || 'Someone',
          commentText,
          post.title || 'your post'
        );
      } catch (error) {
        console.error('Failed to send comment notification:', error);
      }
    }
    
    return comment;
  }
}
```

## 3. User Registration Integration

### In your auth service:

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly notificationsService: NotificationsService,
    // ... other dependencies
  ) {}

  async register(userData: RegisterDto) {
    // Your existing registration logic
    const user = await this.createUser(userData);
    
    // Send welcome notification after successful registration
    try {
      // Wait a bit to ensure user might have had time to subscribe
      setTimeout(async () => {
        await this.notificationsService.sendWelcomeNotification(user._id.toString());
      }, 5000); // 5 seconds delay
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
    }
    
    return user;
  }
}
```

## 4. Videos System Integration

### In your videos service:

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VideosService {
  constructor(
    private readonly notificationsService: NotificationsService,
    // ... other dependencies
  ) {}

  async likeVideo(videoId: string, userId: string) {
    const video = await this.findVideoById(videoId);
    const like = await this.createVideoLike(videoId, userId);
    
    if (video.uploaderId !== userId) {
      try {
        const liker = await this.usersService.findById(userId);
        await this.notificationsService.sendLikeNotification(
          video.uploaderId,
          liker.name || 'Someone',
          video.title || 'your video'
        );
      } catch (error) {
        console.error('Failed to send video like notification:', error);
      }
    }
    
    return like;
  }

  async addVideoComment(videoId: string, userId: string, commentText: string) {
    const video = await this.findVideoById(videoId);
    const comment = await this.createVideoComment(videoId, userId, commentText);
    
    if (video.uploaderId !== userId) {
      try {
        const commenter = await this.usersService.findById(userId);
        await this.notificationsService.sendCommentNotification(
          video.uploaderId,
          commenter.name || 'Someone',
          commentText,
          video.title || 'your video'
        );
      } catch (error) {
        console.error('Failed to send video comment notification:', error);
      }
    }
    
    return comment;
  }
}
```

## 5. Admin Broadcast Notifications

### Create an admin service for sending broadcasts:

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminNotificationService {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendMaintenanceNotification() {
    return await this.notificationsService.sendNotification({
      title: '🔧 Scheduled Maintenance',
      body: 'LNK will be undergoing maintenance tonight from 2-4 AM.',
      url: '/maintenance',
      icon: '/icons/maintenance.png'
    });
  }

  async sendNewFeatureAnnouncement() {
    return await this.notificationsService.sendNotification({
      title: '🚀 New Feature Available!',
      body: 'Check out our new video filters and editing tools.',
      url: '/features',
      icon: '/icons/new-feature.png'
    });
  }

  async sendTargetedPromotion(userIds: string[]) {
    return await this.notificationsService.sendNotification({
      title: '🎉 Special Offer',
      body: 'You have been selected for our premium features trial!',
      url: '/premium',
      userIds,
      icon: '/icons/premium.png'
    });
  }
}
```

## 6. Event-Driven Notifications

### Using events for decoupled notifications:

```typescript
// events/notification.events.ts
export class UserLikedPostEvent {
  constructor(
    public readonly postId: string,
    public readonly postOwnerId: string,
    public readonly likerId: string,
    public readonly postTitle: string,
  ) {}
}

export class UserCommentedEvent {
  constructor(
    public readonly postId: string,
    public readonly postOwnerId: string,
    public readonly commenterId: string,
    public readonly commentText: string,
    public readonly postTitle: string,
  ) {}
}

export class MessageSentEvent {
  constructor(
    public readonly senderId: string,
    public readonly receiverId: string,
    public readonly messageText: string,
  ) {}
}
```

```typescript
// Create an event listener service
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { UserLikedPostEvent, UserCommentedEvent, MessageSentEvent } from '../events/notification.events';

@Injectable()
export class NotificationEventListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  @OnEvent('user.liked.post')
  async handleUserLikedPost(event: UserLikedPostEvent) {
    if (event.postOwnerId !== event.likerId) {
      const liker = await this.usersService.findById(event.likerId);
      await this.notificationsService.sendLikeNotification(
        event.postOwnerId,
        liker.name || 'Someone',
        event.postTitle
      );
    }
  }

  @OnEvent('user.commented')
  async handleUserCommented(event: UserCommentedEvent) {
    if (event.postOwnerId !== event.commenterId) {
      const commenter = await this.usersService.findById(event.commenterId);
      await this.notificationsService.sendCommentNotification(
        event.postOwnerId,
        commenter.name || 'Someone',
        event.commentText,
        event.postTitle
      );
    }
  }

  @OnEvent('message.sent')
  async handleMessageSent(event: MessageSentEvent) {
    const sender = await this.usersService.findById(event.senderId);
    await this.notificationsService.sendMessageNotification(
      event.receiverId,
      sender.name || 'Someone',
      event.messageText
    );
  }
}
```

## 7. Scheduled Notifications

### Create a scheduled notification service:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ScheduledNotificationService {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async sendDailyEngagementReminder() {
    // Find users who haven't been active today
    const inactiveUsers = await this.findInactiveUsers();
    
    for (const userId of inactiveUsers) {
      await this.notificationsService.sendNotification({
        title: '👋 We miss you!',
        body: 'Check out what your friends have been sharing today.',
        url: '/feed',
        userIds: [userId],
        icon: '/icons/engagement.png'
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldSubscriptions() {
    await this.notificationsService.cleanupInactiveSubscriptions();
  }

  private async findInactiveUsers(): Promise<string[]> {
    // Your logic to find inactive users
    return [];
  }
}
```

## 8. Error Handling and Monitoring

### Enhanced error handling:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SafeNotificationService {
  private readonly logger = new Logger(SafeNotificationService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  async safeNotify(
    type: 'welcome' | 'message' | 'like' | 'comment',
    params: any
  ): Promise<void> {
    try {
      switch (type) {
        case 'welcome':
          await this.notificationsService.sendWelcomeNotification(params.userId);
          break;
        case 'message':
          await this.notificationsService.sendMessageNotification(
            params.receiverId,
            params.senderName,
            params.messageText
          );
          break;
        case 'like':
          await this.notificationsService.sendLikeNotification(
            params.postOwnerId,
            params.likerName,
            params.postTitle
          );
          break;
        case 'comment':
          await this.notificationsService.sendCommentNotification(
            params.postOwnerId,
            params.commenterName,
            params.commentText,
            params.postTitle
          );
          break;
      }
      
      this.logger.log(`Successfully sent ${type} notification`);
    } catch (error) {
      this.logger.error(`Failed to send ${type} notification:`, error);
      // Optionally: Store failed notifications for retry
      // await this.storeFailedNotification(type, params, error);
    }
  }
}
```

## 9. Testing Integration

### Create test helpers:

```typescript
// test-helpers/notification-test.helper.ts
export class NotificationTestHelper {
  static createMockSubscription() {
    return {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'mock-p256dh-key',
        auth: 'mock-auth-key'
      },
      userAgent: 'Mozilla/5.0 Test Browser'
    };
  }

  static createMockNotification() {
    return {
      title: 'Test Notification',
      body: 'This is a test notification',
      url: '/test',
      icon: '/icons/test.png'
    };
  }
}
```

This integration guide provides comprehensive examples of how to use the push notifications system throughout your application. Remember to:

1. Always wrap notification calls in try-catch blocks
2. Don't let notification failures break main functionality
3. Log notification errors for monitoring
4. Consider using events for decoupled architecture
5. Test notifications thoroughly in different browsers
6. Monitor notification success rates
7. Clean up inactive subscriptions regularly
