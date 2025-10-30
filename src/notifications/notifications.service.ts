import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscription, PushSubscriptionDocument } from './schemas/push-subscription.schema';
import { SubscribeDto, SendNotificationDto, UnsubscribeDto } from './dto';

export interface NotificationResult {
  successful: number;
  failed: number;
  total: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(PushSubscription.name)
    private readonly pushSubscriptionModel: Model<PushSubscriptionDocument>,
    private readonly configService: ConfigService,
  ) {
    this.initializeWebPush();
  }

  private initializeWebPush() {
    const vapidEmail = this.configService.get<string>('VAPID_EMAIL');
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');

    if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
      this.logger.warn('VAPID keys not configured. Push notifications will not work.');
      return;
    }

    webpush.setVapidDetails(
      `mailto:${vapidEmail}`,
      vapidPublicKey,
      vapidPrivateKey,
    );

    this.logger.log('Web push initialized with VAPID keys');
  }

  async getVapidPublicKey(): Promise<string> {
    const vapidPublicKey = this.configService.get('VAPID_PUBLIC_KEY');
    
    if (!vapidPublicKey) {
      throw new InternalServerErrorException('VAPID public key not configured');
    }
    
    return vapidPublicKey;
  }

  async subscribe(userId: string, subscribeDto: SubscribeDto): Promise<PushSubscriptionDocument> {
    try {
      // First, remove any existing subscriptions from the same device (based on userAgent)
      // This prevents duplicate subscriptions when the same browser/device subscribes multiple times
      if (subscribeDto.userAgent) {
        const existingDeviceSubscriptions = await this.pushSubscriptionModel.find({
          userId,
          userAgent: subscribeDto.userAgent,
        });

        if (existingDeviceSubscriptions.length > 0) {
          await this.pushSubscriptionModel.deleteMany({
            userId,
            userAgent: subscribeDto.userAgent,
          });
          this.logger.log(`Removed ${existingDeviceSubscriptions.length} existing subscriptions for user ${userId} from the same device`);
        }
      }

      // Also check for exact endpoint match (fallback for cases without userAgent)
      const existingEndpointSubscription = await this.pushSubscriptionModel.findOne({
        userId,
        endpoint: subscribeDto.endpoint,
      });

      if (existingEndpointSubscription) {
        await this.pushSubscriptionModel.deleteOne({
          userId,
          endpoint: subscribeDto.endpoint,
        });
        this.logger.log(`Removed existing subscription with same endpoint for user ${userId}`);
      }

      // Create new subscription
      const subscription = new this.pushSubscriptionModel({
        userId,
        endpoint: subscribeDto.endpoint,
        p256dh: subscribeDto.keys.p256dh,
        auth: subscribeDto.keys.auth,
        userAgent: subscribeDto.userAgent,
        isActive: true,
        lastUsed: new Date(),
      });

      const savedSubscription = await subscription.save();
      this.logger.log(`Created push subscription for user ${userId}`);
      
      return savedSubscription;
    } catch (error) {
      this.logger.error(`Failed to subscribe user ${userId}:`, error.message);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  async unsubscribe(userId: string, unsubscribeDto?: UnsubscribeDto): Promise<{ success: boolean; message: string }> {
    try {
      const filter: any = { userId };
      
      if (unsubscribeDto?.endpoint) {
        filter.endpoint = unsubscribeDto.endpoint;
      }

      const result = await this.pushSubscriptionModel.deleteMany(filter);
      
      const message = unsubscribeDto?.endpoint 
        ? `Unsubscribed from specific endpoint`
        : `Unsubscribed from all notifications`;
      
      this.logger.log(`Unsubscribed user ${userId}: ${result.deletedCount} subscriptions removed`);
      
      return {
        success: true,
        message,
      };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe user ${userId}:`, error.message);
      throw new BadRequestException('Failed to unsubscribe');
    }
  }

  async sendNotification(sendNotificationDto: SendNotificationDto): Promise<NotificationResult> {
    try {
      const { title, body, url, userIds, icon, badge } = sendNotificationDto;

      // Get subscriptions
      const filter: any = { isActive: true };
      if (userIds && userIds.length > 0) {
        filter.userId = { $in: userIds };
      }

      const subscriptions = await this.pushSubscriptionModel.find(filter);

      if (subscriptions.length === 0) {
        return { successful: 0, failed: 0, total: 0 };
      }

      const payload: NotificationPayload = {
        title,
        body,
        icon: icon || '/icons/default-icon.png',
        badge: badge || '/icons/default-badge.png',
        url,
      };

      const results = await this.sendToSubscriptions(subscriptions, payload);
      
      this.logger.log(`Sent notifications: ${results.successful}/${results.total} successful`);
      
      return results;
    } catch (error) {
      this.logger.error('Failed to send notifications:', error.message);
      throw new InternalServerErrorException('Failed to send notifications');
    }
  }

  async sendWelcomeNotification(userId: string): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title: 'Bienvenue! 🎉',
        body: 'Bienvenue sur YamoZone! Commencez à explorer et à vous connecter avec les autres.',
        icon: '/icons/welcome-icon-party.png',
        url: '/',
      };

      await this.sendToUserSubscriptions(userId, payload);
      this.logger.log(`Sent welcome notification to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome notification to user ${userId}:`, error.message);
    }
  }

  async sendWelcomeBackNotification(userId: string): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title: 'Bon retour! 👋',
        body: 'Content de vous revoir sur YamoZone! Découvrez les nouvelles publications et messages.',
        icon: '/icons/welcome-back-icon.png',
        url: '/',
      };

      await this.sendToUserSubscriptions(userId, payload);
      this.logger.log(`Sent welcome back notification to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome back notification to user ${userId}:`, error.message);
    }
  }

  async sendMessageNotification(
    receiverUserId: string,
    senderName: string,
    messagePreview: string,
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title: `Nouveau message de ${senderName}`,
        body: messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview,
        icon: '/icons/message-icon.png',
        url: '/messages',
      };

      await this.sendToUserSubscriptions(receiverUserId, payload);
      this.logger.log(`Sent message notification to user ${receiverUserId}`);
    } catch (error) {
      this.logger.error(`Failed to send message notification to user ${receiverUserId}:`, error.message);
    }
  }

  async sendLikeNotification(
    postOwnerId: string,
    likerName: string,
    postTitle: string,
    contentType: 'post' | 'video' = 'post',
  ): Promise<void> {
    try {
      const typeText = contentType === 'video' ? 'votre vidéo' : 'votre publication';
      const truncatedTitle = postTitle && postTitle.length > 50 
        ? `"${postTitle.substring(0, 50)}..."` 
        : postTitle ? `"${postTitle}"` : typeText;

      const payload: NotificationPayload = {
        title: `${likerName} a aimé ${typeText}`,
        body: truncatedTitle,
        icon: '/icons/like-icon.png',
        url: contentType === 'video' ? '/videos' : '/posts',
      };

      await this.sendToUserSubscriptions(postOwnerId, payload);
      this.logger.log(`Sent like notification to user ${postOwnerId}`);
    } catch (error) {
      this.logger.error(`Failed to send like notification to user ${postOwnerId}:`, error.message);
    }
  }

  async sendCommentNotification(
    postOwnerId: string,
    commenterName: string,
    commentPreview: string,
    postTitle: string,
    contentType: 'post' | 'video' = 'post',
  ): Promise<void> {
    try {
      const typeText = contentType === 'video' ? 'votre vidéo' : 'votre publication';
      const truncatedComment = commentPreview.length > 80 
        ? `"${commentPreview.substring(0, 80)}..."` 
        : `"${commentPreview}"`;

      const payload: NotificationPayload = {
        title: `${commenterName} a commenté ${typeText}`,
        body: truncatedComment,
        icon: '/icons/comment-icon.png',
        url: contentType === 'video' ? '/videos' : '/posts',
      };

      await this.sendToUserSubscriptions(postOwnerId, payload);
      this.logger.log(`Sent comment notification to user ${postOwnerId}`);
    } catch (error) {
      this.logger.error(`Failed to send comment notification to user ${postOwnerId}:`, error.message);
    }
  }

  async sendNewPostNotification(
    authorName: string,
    postTitle: string,
  ): Promise<void> {
    try {
      const truncatedTitle = postTitle && postTitle.length > 60 
        ? `${postTitle.substring(0, 60)}...` 
        : postTitle || 'une nouvelle publication';

      const payload: NotificationPayload = {
        title: `📝 Nouvelle publication de ${authorName}`,
        body: truncatedTitle,
        icon: '/icons/post-icon.png',
        url: '/posts',
      };

      // Send to all active subscribers
      await this.sendToAllActiveSubscriptions(payload);
      this.logger.log(`Sent new post notification for "${postTitle}" by ${authorName}`);
    } catch (error) {
      this.logger.error(`Failed to send new post notification:`, error.message);
    }
  }

  async sendNewVideoNotification(
    authorName: string,
    videoTitle: string,
  ): Promise<void> {
    try {
      const truncatedTitle = videoTitle && videoTitle.length > 60 
        ? `${videoTitle.substring(0, 60)}...` 
        : videoTitle || 'une nouvelle vidéo';

      const payload: NotificationPayload = {
        title: `🎥 Nouvelle vidéo de ${authorName}`,
        body: truncatedTitle,
        icon: '/icons/video-icon.png',
        url: '/videos',
      };

      // Send to all active subscribers
      await this.sendToAllActiveSubscriptions(payload);
      this.logger.log(`Sent new video notification for "${videoTitle}" by ${authorName}`);
    } catch (error) {
      this.logger.error(`Failed to send new video notification:`, error.message);
    }
  }

  private async sendToAllActiveSubscriptions(payload: NotificationPayload): Promise<NotificationResult> {
    const subscriptions = await this.pushSubscriptionModel.find({
      isActive: true,
    });

    if (subscriptions.length === 0) {
      return { successful: 0, failed: 0, total: 0 };
    }

    return await this.sendToSubscriptions(subscriptions, payload);
  }

  private async sendToUserSubscriptions(userId: string, payload: NotificationPayload): Promise<NotificationResult> {
    const subscriptions = await this.pushSubscriptionModel.find({
      userId,
      isActive: true,
    });

    if (subscriptions.length === 0) {
      return { successful: 0, failed: 0, total: 0 };
    }

    return await this.sendToSubscriptions(subscriptions, payload);
  }

  private async sendToSubscriptions(
    subscriptions: PushSubscriptionDocument[],
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    const results: NotificationResult = {
      successful: 0,
      failed: 0,
      total: subscriptions.length,
    };

    const promises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          {
            TTL: 86400, // 24 hours
          },
        );

        // Update last used timestamp
        subscription.lastUsed = new Date();
        await subscription.save();

        results.successful++;
      } catch (error) {
        results.failed++;
        
        // Enhanced error logging for debugging
        this.logger.warn(`Failed to send notification to subscription ${subscription._id}:`, error.message);
        this.logger.warn(`Error details - Status: ${error.statusCode}, Headers: ${JSON.stringify(error.headers)}`);
        this.logger.warn(`Subscription endpoint: ${subscription.endpoint.substring(0, 50)}...`);
        
        if (error.body) {
          this.logger.warn(`Error body: ${error.body}`);
        }

        // Handle invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          this.logger.log(`Deactivating invalid subscription: ${subscription._id}`);
          subscription.isActive = false;
          await subscription.save();
        } else if (error.statusCode === 400) {
          this.logger.error(`Bad request error - possibly invalid VAPID keys or malformed subscription`);
        } else if (error.statusCode === 413) {
          this.logger.error(`Payload too large - reduce notification data size`);
        }
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  // Utility methods
  async getActiveSubscriptionsCount(userId?: string): Promise<number> {
    const filter: any = { isActive: true };
    if (userId) {
      filter.userId = userId;
    }
    
    return await this.pushSubscriptionModel.countDocuments(filter);
  }

  async getUserSubscriptions(userId: string): Promise<PushSubscriptionDocument[]> {
    return await this.pushSubscriptionModel.find({
      userId,
      isActive: true,
    });
  }

  async cleanupInactiveSubscriptions(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.pushSubscriptionModel.deleteMany({
      isActive: false,
      updatedAt: { $lt: thirtyDaysAgo },
    });

    this.logger.log(`Cleaned up ${result.deletedCount} inactive subscriptions`);
  }
}
