import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService, NotificationResult } from './notifications.service';
import { SubscribeDto, SendNotificationDto, UnsubscribeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email?: string;
    originalUserId?: string;
  };
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for push notification subscription' })
  @ApiResponse({
    status: 200,
    description: 'VAPID public key retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            publicKey: { type: 'string', example: 'BKxX...' },
          },
        },
        message: { type: 'string', example: 'VAPID public key retrieved successfully' },
      },
    },
  })
  async getVapidPublicKey() {
    try {
      const publicKey = await this.notificationsService.getVapidPublicKey();
      
      return {
        success: true,
        data: { publicKey },
        message: 'VAPID public key retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to push notifications',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            endpoint: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string' },
            lastUsed: { type: 'string' },
          },
        },
        message: { type: 'string', example: 'Successfully subscribed to push notifications' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid subscription data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Failed to create subscription' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  async subscribe(
    @Body() subscribeDto: SubscribeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.originalUserId || req.user.sub;
      const subscription = await this.notificationsService.subscribe(userId, subscribeDto);
      
      return {
        success: true,
        data: subscription,
        message: 'Successfully subscribed to push notifications',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 400,
      };
    }
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({
    status: 200,
    description: 'Successfully unsubscribed from push notifications',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        message: { type: 'string', example: 'Successfully unsubscribed from push notifications' },
      },
    },
  })
  async unsubscribe(
    @Body() unsubscribeDto: UnsubscribeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.originalUserId || req.user.sub;
      const result = await this.notificationsService.unsubscribe(userId, unsubscribeDto);
      
      return {
        success: true,
        data: result,
        message: 'Successfully unsubscribed from push notifications',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 400,
      };
    }
  }

  @Post('send')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Send push notification (Admin only)',
    description: 'Send push notifications to specified users or all users if no userIds provided',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            successful: { type: 'number', example: 5 },
            failed: { type: 'number', example: 1 },
            total: { type: 'number', example: 6 },
          },
        },
        message: { type: 'string', example: 'Notification sent successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Admin access required' },
        statusCode: { type: 'number', example: 403 },
      },
    },
  })
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    try {
      const result = await this.notificationsService.sendNotification(sendNotificationDto);
      
      return {
        success: true,
        data: result,
        message: 'Notification sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  @Get('subscriptions/count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get count of active subscriptions for current user' })
  @ApiResponse({
    status: 200,
    description: 'Active subscriptions count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 3 },
          },
        },
        message: { type: 'string', example: 'Active subscriptions count retrieved successfully' },
      },
    },
  })
  async getSubscriptionsCount(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.originalUserId || req.user.sub;
      const count = await this.notificationsService.getActiveSubscriptionsCount(userId);
      
      return {
        success: true,
        data: { count },
        message: 'Active subscriptions count retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active subscriptions for current user' })
  @ApiResponse({
    status: 200,
    description: 'Active subscriptions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              endpoint: { type: 'string' },
              userAgent: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
              lastUsed: { type: 'string' },
            },
          },
        },
        message: { type: 'string', example: 'Active subscriptions retrieved successfully' },
      },
    },
  })
  async getUserSubscriptions(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.originalUserId || req.user.sub;
      const subscriptions = await this.notificationsService.getUserSubscriptions(userId);
      
      return {
        success: true,
        data: subscriptions,
        message: 'Active subscriptions retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }

  @Post('test/welcome')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test welcome notification to current user' })
  @ApiResponse({
    status: 200,
    description: 'Test welcome notification sent successfully',
  })
  async sendTestWelcomeNotification(@Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user.originalUserId || req.user.sub;
      await this.notificationsService.sendWelcomeNotification(userId);
      
      return {
        success: true,
        message: 'Test welcome notification sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }
  }
}
