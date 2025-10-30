import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Schemas
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessageRead, MessageReadSchema } from './schemas/message-read.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

// Services
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';

// Controllers
import { ConversationController } from './controllers/conversation.controller';
import {
  MessageController,
  MessageManagementController,
} from './controllers/message.controller';
import { ChatFileUploadController } from './controllers/chat-upload.controller';

// Gateway
import { MessagingGateway } from './gateways/messaging.gateway';

// External modules
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WatermarkModule } from '../common/watermark.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: MessageRead.name, schema: MessageReadSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
    forwardRef(() => RedisModule),
    NotificationsModule,
    WatermarkModule,
  ],
  controllers: [
    ConversationController,
    MessageController,
    MessageManagementController,
    ChatFileUploadController,
  ],
  providers: [ConversationService, MessageService, MessagingGateway],
  exports: [ConversationService, MessageService, MessagingGateway],
})
export class MessagingModule {}
