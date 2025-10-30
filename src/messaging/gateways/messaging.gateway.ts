import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from '../services/message.service';
import { ConversationService } from '../services/conversation.service';
import { RedisService } from '../../redis/redis.service';
import { CreateMessageDto } from '../dto/message.dto';

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: any;
}

interface TypingData {
  conversationId: string;
}

interface JoinConversationData {
  conversationId: string;
}

interface OnlineStatusData {
  isOnline: boolean;
  lastSeen?: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'https://yamozone.com'],
    credentials: true,
  },
  namespace: '/chat',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // userId -> socketId
  private readonly userSockets = new Map<string, string>(); // socketId -> userId
  private readonly typingUsers = new Map<string, Set<string>>(); // conversationId -> Set<userId>

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => ConversationService))
    private readonly conversationService: ConversationService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.user = payload;

      // Store user connection
      this.connectedUsers.set(client.userId, client.id);
      this.userSockets.set(client.id, client.userId);

      // Update user online status
      await this.updateUserOnlineStatus(client.userId, true);

      // Join user to their personal room
      client.join(`user:${client.userId}`);

      // Get user's conversations and join their rooms
      const conversations =
        await this.conversationService.findUserConversations(client.userId, {
          page: 1,
          limit: 100,
        });

      for (const conversation of conversations.conversations) {
        client.join(`conversation:${conversation._id}`);
      }

      // Notify other users that this user is online
      this.server.emit('user_online_status', {
        userId: client.userId,
        isOnline: true,
        lastSeen: new Date(),
      });

      this.logger.log(
        `User ${client.userId} connected with socket ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove from connected users
      this.connectedUsers.delete(client.userId);
      this.userSockets.delete(client.id);

      // Update user offline status
      await this.updateUserOnlineStatus(client.userId, false);

      // Stop typing in all conversations
      for (const [conversationId, typingUsers] of this.typingUsers.entries()) {
        if (typingUsers.has(client.userId)) {
          typingUsers.delete(client.userId);
          client.to(`conversation:${conversationId}`).emit('user_typing', {
            conversationId,
            userId: client.userId,
            isTyping: false,
          });
        }
      }

      // Notify other users that this user is offline
      this.server.emit('user_online_status', {
        userId: client.userId,
        isOnline: false,
        lastSeen: new Date(),
      });

      this.logger.log(`User ${client.userId} disconnected`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinConversationData,
  ) {
    try {
      // Verify user can access this conversation
      await this.conversationService.findById(
        data.conversationId,
        client.userId,
      );

      // Join the conversation room
      client.join(`conversation:${data.conversationId}`);

      this.logger.log(
        `User ${client.userId} joined conversation ${data.conversationId}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinConversationData,
  ) {
    try {
      // Leave the conversation room
      client.leave(`conversation:${data.conversationId}`);

      // Stop typing if user was typing
      const typingUsers = this.typingUsers.get(data.conversationId);
      if (typingUsers?.has(client.userId)) {
        typingUsers.delete(client.userId);
        client.to(`conversation:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId: client.userId,
          isTyping: false,
        });
      }

      this.logger.log(
        `User ${client.userId} left conversation ${data.conversationId}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Error leaving conversation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; message: CreateMessageDto },
  ) {
    try {
      // Create the message
      const message = await this.messageService.create(
        data.conversationId,
        data.message,
        client.userId,
      );

      // Emit to all users in the conversation
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message_received', {
          message,
          conversationId: data.conversationId,
        });

      // Update conversation for all participants
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('conversation_updated', {
          conversationId: data.conversationId,
          lastMessage: data.message.content,
          lastMessageAt: new Date(),
        });

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingData,
  ) {
    try {
      // Add user to typing users for this conversation
      if (!this.typingUsers.has(data.conversationId)) {
        this.typingUsers.set(data.conversationId, new Set());
      }
      this.typingUsers.get(data.conversationId)!.add(client.userId);

      // Store typing status in Redis with expiration
      await this.redisService.setex(
        `typing:${data.conversationId}:${client.userId}`,
        10, // 10 seconds expiration
        'true',
      );

      // Notify other users in the conversation
      client.to(`conversation:${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: client.userId,
        isTyping: true,
        user: {
          id: client.userId,
          name: client.user.name,
          avatar: client.user.avatar,
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling typing start: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingData,
  ) {
    try {
      // Remove user from typing users
      const typingUsers = this.typingUsers.get(data.conversationId);
      if (typingUsers) {
        typingUsers.delete(client.userId);
      }

      // Remove from Redis
      await this.redisService.del(
        `typing:${data.conversationId}:${client.userId}`,
      );

      // Notify other users
      client.to(`conversation:${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: client.userId,
        isTyping: false,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling typing stop: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      await this.messageService.markAsRead(data.messageId, client.userId);

      // Notify sender that message was read
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message_read', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          readBy: client.userId,
          readAt: new Date(),
        });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('user_online')
  async handleUserOnline(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: OnlineStatusData,
  ) {
    try {
      await this.updateUserOnlineStatus(client.userId, data.isOnline);

      // Broadcast online status to all users
      this.server.emit('user_online_status', {
        userId: client.userId,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen || new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error updating online status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Helper method to send message to specific user
  async sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Helper method to send to conversation
  async sendToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Helper method to get online users count
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Helper method to get users typing in conversation
  getTypingUsers(conversationId: string): string[] {
    return Array.from(this.typingUsers.get(conversationId) || []);
  }

  // Helper method to notify conversation participants about new messages
  async notifyNewMessage(conversationId: string, message: any): Promise<void> {
    try {
      // this.logger.log(`🚀 Sending new_message event to conversation:${conversationId}`);
      // this.logger.debug(`📝 Message details: ${JSON.stringify({
      //   messageId: message._id || message.id,
      //   senderId: message.senderId,
      //   content: message.content?.substring(0, 50) + '...',
      //   type: message.type,
      //   conversationId
      // })}`);

      const eventPayload = {
        conversationId,
        message,
      };

      this.server
        .to(`conversation:${conversationId}`)
        .emit('new_message', eventPayload);

      // this.logger.log(`✅ new_message event sent successfully to conversation:${conversationId}`);
      // this.logger.debug(`📊 Event payload size: ${JSON.stringify(eventPayload).length} chars`);
    } catch (error) {
      this.logger.error(`❌ Error notifying new message: ${error.message}`);
      this.logger.error(`🔍 Error details:`, error.stack);
    }
  }

  // Helper method to notify about message updates
  async notifyMessageUpdate(
    conversationId: string,
    message: any,
  ): Promise<void> {
    try {
      this.logger.log(
        `🔄 Sending message_updated event to conversation:${conversationId}`,
      );
      this.logger.debug(
        `✏️ Updated message details: ${JSON.stringify({
          messageId: message._id || message.id,
          senderId: message.senderId,
          content: message.content?.substring(0, 50) + '...',
          editedAt: message.editedAt,
          conversationId,
        })}`,
      );

      const eventPayload = {
        conversationId,
        message,
      };

      this.server
        .to(`conversation:${conversationId}`)
        .emit('message_updated', eventPayload);

      this.logger.log(
        `✅ message_updated event sent successfully to conversation:${conversationId}`,
      );
      this.logger.debug(
        `📊 Event payload size: ${JSON.stringify(eventPayload).length} chars`,
      );
    } catch (error) {
      this.logger.error(`❌ Error notifying message update: ${error.message}`);
      this.logger.error(`🔍 Error details:`, error.stack);
    }
  }

  // Helper method to notify about new conversations
  async notifyNewConversation(conversation: any): Promise<void> {
    try {
      this.logger.log(
        `💬 Sending new_conversation event for conversation:${conversation._id || conversation.id}`,
      );
      this.logger.debug(
        `👥 Conversation details: ${JSON.stringify({
          conversationId: conversation._id || conversation.id,
          type: conversation.type,
          participantCount: conversation.participants?.length || 0,
          groupName: conversation.groupName || 'N/A',
        })}`,
      );

      const eventPayload = { conversation };

      // Notify all participants
      for (const participantId of conversation.participants) {
        const participantIdStr = participantId.toString();
        this.logger.debug(
          `📤 Sending new_conversation to user:${participantIdStr}`,
        );
        this.server
          .to(`user:${participantIdStr}`)
          .emit('new_conversation', eventPayload);
      }

      this.logger.log(
        `✅ new_conversation event sent to ${conversation.participants.length} participants`,
      );
      this.logger.debug(
        `📊 Event payload size: ${JSON.stringify(eventPayload).length} chars`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error notifying new conversation: ${error.message}`,
      );
      this.logger.error(`🔍 Error details:`, error.stack);
    }
  }

  private async updateUserOnlineStatus(userId: string, isOnline: boolean) {
    try {
      // Store in Redis for fast access
      const key = `user:${userId}:online`;
      if (isOnline) {
        await this.redisService.set(key, 'true');
        await this.redisService.expire(key, 300); // 5 minutes expiration
      } else {
        await this.redisService.del(key);
      }

      // Also store last seen
      await this.redisService.set(
        `user:${userId}:last_seen`,
        new Date().toISOString(),
      );
    } catch (error) {
      this.logger.error(
        `Error updating online status in Redis: ${error.message}`,
      );
    }
  }
}
