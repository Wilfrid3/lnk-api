import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from './services/message.service';
import { ConversationService } from './services/conversation.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/messaging',
})
@Injectable()
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private userSockets = new Map<string, AuthenticatedSocket>(); // socketId -> socket

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from auth or query
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.user = payload;

      if (!client.userId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Store connection
      this.connectedUsers.set(client.userId, client.id);
      this.userSockets.set(client.id, client);

      this.logger.log(
        `Client connected: ${client.id} (User: ${client.userId})`,
      );

      // Notify other users that this user is online
      client.broadcast.emit('userOnline', {
        userId: client.userId,
        timestamp: new Date(),
      });

      // Send user their online status
      client.emit('connectionStatus', {
        status: 'connected',
        userId: client.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.userSockets.delete(client.id);

      // Notify other users that this user is offline
      client.broadcast.emit('userOffline', {
        userId: client.userId,
        timestamp: new Date(),
      });

      this.logger.log(
        `Client disconnected: ${client.id} (User: ${client.userId})`,
      );
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Verify user is part of conversation
      const conversation = await this.conversationService.findById(
        data.conversationId,
        client.userId!,
      );

      if (!conversation) {
        client.emit('error', {
          message: 'Conversation not found or access denied',
        });
        return;
      }

      // Join the conversation room
      await client.join(`conversation:${data.conversationId}`);

      client.emit('joinedConversation', {
        conversationId: data.conversationId,
        timestamp: new Date(),
      });

      this.logger.log(
        `User ${client.userId} joined conversation ${data.conversationId}`,
      );
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      await client.leave(`conversation:${data.conversationId}`);

      client.emit('leftConversation', {
        conversationId: data.conversationId,
        timestamp: new Date(),
      });

      this.logger.log(
        `User ${client.userId} left conversation ${data.conversationId}`,
      );
    } catch (error) {
      this.logger.error(`Error leaving conversation: ${error.message}`);
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; typing: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Broadcast typing status to other users in the conversation
      client.to(`conversation:${data.conversationId}`).emit('userTyping', {
        userId: client.userId,
        conversationId: data.conversationId,
        typing: data.typing,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error handling typing: ${error.message}`);
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string; messageId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (data.messageId) {
        // Mark specific message as read
        await this.messageService.markAsRead(data.messageId, client.userId!);
      } else {
        // Mark all messages in conversation as read
        await this.messageService.markAllAsRead(
          data.conversationId,
          client.userId!,
        );
      }

      // Update unread count in conversation
      await this.conversationService.resetUnreadCount(
        data.conversationId,
        client.userId!,
      );

      // Notify other users about read status
      client.to(`conversation:${data.conversationId}`).emit('messageRead', {
        conversationId: data.conversationId,
        messageId: data.messageId,
        readBy: client.userId,
        timestamp: new Date(),
      });

      client.emit('markedAsRead', {
        conversationId: data.conversationId,
        messageId: data.messageId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error marking as read: ${error.message}`);
      client.emit('error', { message: 'Failed to mark as read' });
    }
  }

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Get conversation participants
      const conversation = await this.conversationService.findById(
        data.conversationId,
        client.userId!,
      );

      if (!conversation) {
        client.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Check which participants are online
      const onlineUsers = conversation.participants
        .map((participantId) => participantId.toString())
        .filter((participantId) => this.connectedUsers.has(participantId));

      client.emit('onlineUsers', {
        conversationId: data.conversationId,
        onlineUsers,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error getting online users: ${error.message}`);
      client.emit('error', { message: 'Failed to get online users' });
    }
  }

  // Helper method to notify conversation participants about new messages
  async notifyNewMessage(
    conversationId: string,
    message: any,
    senderId: string,
  ) {
    try {
      this.server.to(`conversation:${conversationId}`).emit('newMessage', {
        message,
        conversationId,
        senderId,
        timestamp: new Date(),
      });

      this.logger.log(
        `New message notification sent to conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(`Error notifying new message: ${error.message}`);
    }
  }

  // Helper method to notify about message updates
  async notifyMessageUpdate(
    conversationId: string,
    message: any,
    action: 'edited' | 'deleted',
  ) {
    try {
      this.server.to(`conversation:${conversationId}`).emit('messageUpdated', {
        message,
        conversationId,
        action,
        timestamp: new Date(),
      });

      this.logger.log(
        `Message ${action} notification sent to conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(`Error notifying message update: ${error.message}`);
    }
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Helper method to get user's socket
  getUserSocket(userId: string): AuthenticatedSocket | undefined {
    const socketId = this.connectedUsers.get(userId);
    return socketId ? this.userSockets.get(socketId) : undefined;
  }

  // Helper method to send direct message to user
  async sendToUser(userId: string, event: string, data: any) {
    const socket = this.getUserSocket(userId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }
}
