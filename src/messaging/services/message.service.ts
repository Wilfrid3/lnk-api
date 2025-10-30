import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../schemas/message.schema';
import {
  MessageRead,
  MessageReadDocument,
} from '../schemas/message-read.schema';
import {
  User,
  UserDocument,
  ServicePackage,
} from '../../users/schemas/user.schema';
import { ConversationService } from './conversation.service';
import { MessagingGateway } from '../gateways/messaging.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageQueryDto,
  ServiceOfferMessageDto,
  BookingRequestMessageDto,
  LocationMessageDto,
  BulkMarkReadDto,
} from '../dto/message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(MessageRead.name)
    private messageReadModel: Model<MessageReadDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => ConversationService))
    private conversationService: ConversationService,
    @Inject(forwardRef(() => MessagingGateway))
    private messagingGateway: MessagingGateway,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    conversationId: string,
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    // Verify conversation exists and user is participant
    await this.conversationService.findById(conversationId, userId);

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
      ...createMessageDto,
      readBy: new Map([[userId, new Date()]]),
    });

    const savedMessage = await message.save();

    // Update conversation last message
    await this.conversationService.updateLastMessage(
      conversationId,
      createMessageDto.content,
    );

    // Increment unread count for other participants
    await this.conversationService.incrementUnreadCount(conversationId, userId);

    const populatedMessage = await this.populateMessage(savedMessage);
    const finalMessage = populatedMessage || savedMessage;

    // Send socket notification for new message
    console.log(
      `📨 MessageService: Calling notifyNewMessage for conversation ${conversationId}, message ${finalMessage._id}`,
    );
    await this.messagingGateway.notifyNewMessage(conversationId, finalMessage);
    // console.log(
    //   `✅ MessageService: notifyNewMessage completed for conversation ${conversationId}`,
    // );

    // Send push notification to other participants (async, non-blocking)
    setImmediate(async () => {
      try {
        const conversation = await this.conversationService.findById(conversationId, userId);
        const sender = await this.userModel.findById(userId);
        const senderName = sender?.name || 'Quelqu\'un';

        // Find other participants (excluding the sender)
        const otherParticipants = conversation.participants.filter(
          (participantId: any) => participantId.toString() !== userId,
        );

        // Send push notification to each other participant
        for (const participantId of otherParticipants) {
          if (participantId._id.toString() === userId) continue; // Skip sender
          await this.notificationsService.sendMessageNotification(
            participantId._id.toString(),
            senderName,
            createMessageDto.content,
          );
        }

        // console.log(`✅ MessageService: Push notifications sent for conversation ${conversationId} - ${otherParticipants}`);
      } catch (error) {
        console.error(`❌ MessageService: Failed to send push notifications for conversation ${conversationId}:`, error.message);
        // Don't throw error as message creation was successful
      }
    });

    return finalMessage;
  }

  async createServiceOffer(
    conversationId: string,
    serviceOfferDto: ServiceOfferMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    // Get user's service package
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const servicePackage = user.servicePackages?.find(
      (pkg: ServicePackage) => pkg._id === serviceOfferDto.servicePackageId,
    );

    if (!servicePackage) {
      throw new NotFoundException('Service package not found');
    }

    const messageContent =
      serviceOfferDto.message || `Service proposé: ${servicePackage.title}`;

    const createMessageDto: CreateMessageDto = {
      content: messageContent,
      type: 'service_offer',
      metadata: {
        servicePackageId: servicePackage._id,
        serviceName: servicePackage.title,
        price: servicePackage.price,
        currency: servicePackage.currency,
        duration: servicePackage.duration,
      },
    };

    return this.create(conversationId, createMessageDto, userId);
  }

  async createBookingRequest(
    conversationId: string,
    bookingRequestDto: BookingRequestMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    // Find the conversation to get the service provider
    const conversation = await this.conversationService.findById(
      conversationId,
      userId,
    );

    // Find the other participant (service provider)
    const otherParticipantId = conversation.participants.find(
      (p: any) => p._id.toString() !== userId,
    );

    if (!otherParticipantId) {
      throw new BadRequestException('Invalid conversation');
    }

    // Get service provider's service package
    const serviceProvider = await this.userModel.findById(otherParticipantId);
    const servicePackage = serviceProvider?.servicePackages?.find(
      (pkg: ServicePackage) => pkg._id === bookingRequestDto.servicePackageId,
    );

    if (!servicePackage) {
      throw new NotFoundException('Service package not found');
    }

    const messageContent =
      bookingRequestDto.message ||
      `Demande de réservation: ${servicePackage.title}`;

    const createMessageDto: CreateMessageDto = {
      content: messageContent,
      type: 'booking_request',
      metadata: {
        servicePackageId: servicePackage._id,
        serviceName: servicePackage.title,
        price: servicePackage.price,
        currency: servicePackage.currency,
        duration: servicePackage.duration,
        requestedDate: bookingRequestDto.requestedDate
          ? new Date(bookingRequestDto.requestedDate)
          : undefined,
        requestedTime: bookingRequestDto.requestedTime,
      },
    };

    return this.create(conversationId, createMessageDto, userId);
  }

  async createLocationMessage(
    conversationId: string,
    locationDto: LocationMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    const messageContent = locationDto.message || 'Localisation partagée';

    const createMessageDto: CreateMessageDto = {
      content: messageContent,
      type: 'location',
      metadata: {
        latitude: locationDto.latitude,
        longitude: locationDto.longitude,
        address: locationDto.address,
      },
    };

    return this.create(conversationId, createMessageDto, userId);
  }

  async findConversationMessages(
    conversationId: string,
    query: MessageQueryDto,
    userId: string,
  ): Promise<{
    messages: MessageDocument[];
    pagination: any;
  }> {
    // Verify user can access this conversation
    await this.conversationService.findById(conversationId, userId);

    const { page = 1, limit = 50, type, search, after, before } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
      conversationId: new Types.ObjectId(conversationId),
      deletedAt: { $exists: false },
      deletedFor: { $nin: [new Types.ObjectId(userId)] },
    };

    if (type) {
      filter.type = type;
    }

    if (search) {
      filter.content = { $regex: search, $options: 'i' };
    }

    if (after || before) {
      filter.createdAt = {};
      if (after) filter.createdAt.$gte = new Date(after);
      if (before) filter.createdAt.$lte = new Date(before);
    }

    // Get messages with pagination
    const messages = await this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar isVerified isPremium')
      .populate('replyToId')
      .exec();

    // Get total count
    const totalCount = await this.messageModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findById(messageId: string, userId?: string): Promise<MessageDocument> {
    const filter: any = { _id: messageId, deletedAt: { $exists: false } };

    if (userId) {
      filter.deletedFor = { $nin: [new Types.ObjectId(userId)] };
    }

    const message = await this.messageModel
      .findOne(filter)
      .populate('senderId', 'name avatar isVerified isPremium')
      .populate('replyToId')
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async update(
    messageId: string,
    updateMessageDto: UpdateMessageDto,
    userId: string,
  ): Promise<MessageDocument> {
    const message = await this.findById(messageId, userId);

    // Only message sender can edit
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Cannot edit messages older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messageDoc = message.toObject();
    if (new Date(messageDoc.createdAt) < twentyFourHoursAgo) {
      throw new BadRequestException('Cannot edit messages older than 24 hours');
    }

    message.content = updateMessageDto.content;
    message.editedAt = new Date();

    const updatedMessage = await message.save();
    const populatedMessage = await this.populateMessage(updatedMessage);
    const finalMessage = populatedMessage || updatedMessage;

    // Send socket notification for message update
    console.log(
      `🔄 MessageService: Calling notifyMessageUpdate for conversation ${message.conversationId.toString()}, message ${finalMessage._id}`,
    );
    await this.messagingGateway.notifyMessageUpdate(
      message.conversationId.toString(),
      finalMessage,
    );
    console.log(
      `✅ MessageService: notifyMessageUpdate completed for conversation ${message.conversationId.toString()}`,
    );

    return finalMessage;
  }

  async delete(messageId: string, userId: string): Promise<void> {
    const message = await this.findById(messageId, userId);

    // Only message sender can delete
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.deletedAt = new Date();
    await message.save();
  }

  async deleteForUser(messageId: string, userId: string): Promise<void> {
    const message = await this.findById(messageId, userId);

    if (!message.deletedFor.includes(userId as any)) {
      message.deletedFor.push(new Types.ObjectId(userId));
      await message.save();
    }
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.findById(messageId, userId);

    // Add to message readBy map
    message.readBy.set(userId, new Date());
    await message.save();

    // Create/update MessageRead document for scalability
    await this.messageReadModel.findOneAndUpdate(
      {
        messageId: new Types.ObjectId(messageId),
        userId: new Types.ObjectId(userId),
      },
      {
        messageId: new Types.ObjectId(messageId),
        userId: new Types.ObjectId(userId),
        conversationId: message.conversationId,
        readAt: new Date(),
      },
      { upsert: true },
    );

    // Reset unread count for this conversation
    await this.conversationService.resetUnreadCount(
      message.conversationId.toString(),
      userId,
    );
  }

  async bulkMarkAsRead(
    conversationId: string,
    bulkMarkReadDto: BulkMarkReadDto,
    userId: string,
  ): Promise<void> {
    // Verify user can access conversation
    await this.conversationService.findById(conversationId, userId);

    const { messageIds } = bulkMarkReadDto;

    // Find messages that are not yet read by this user
    const existingReads = await this.messageReadModel
      .find({
        messageId: { $in: messageIds.map((id) => new Types.ObjectId(id)) },
        userId: new Types.ObjectId(userId),
      })
      .select('messageId');

    const alreadyReadMessageIds = existingReads.map((read) =>
      read.messageId.toString(),
    );
    const unreadMessageIds = messageIds.filter(
      (id) => !alreadyReadMessageIds.includes(id),
    );

    if (unreadMessageIds.length === 0) {
      // All messages are already read
      return;
    }

    // Update all unread messages at once
    await this.messageModel.updateMany(
      {
        _id: { $in: unreadMessageIds.map((id) => new Types.ObjectId(id)) },
        conversationId: new Types.ObjectId(conversationId),
      },
      {
        [`readBy.${userId}`]: new Date(),
      },
    );

    // Bulk create MessageRead documents only for unread messages
    const messageReadDocs = unreadMessageIds.map((messageId) => ({
      messageId: new Types.ObjectId(messageId),
      userId: new Types.ObjectId(userId),
      conversationId: new Types.ObjectId(conversationId),
      readAt: new Date(),
    }));

    if (messageReadDocs.length > 0) {
      await this.messageReadModel.insertMany(messageReadDocs, {
        ordered: false,
      });
    }

    // Reset unread count
    await this.conversationService.resetUnreadCount(conversationId, userId);
  }

  async addReaction(
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<MessageDocument> {
    const message = await this.findById(messageId, userId);

    // Remove existing reaction from this user
    const userObjectId = new Types.ObjectId(userId);
    message.reactions = message.reactions.filter(
      (r: Types.ObjectId) => r.toString() !== userId,
    );
    message.reactionTypes.delete(userId);

    // Add new reaction
    message.reactions.push(userObjectId);
    message.reactionTypes.set(userId, reaction);

    return message.save();
  }

  async removeReaction(
    messageId: string,
    userId: string,
  ): Promise<MessageDocument> {
    const message = await this.findById(messageId, userId);

    message.reactions = message.reactions.filter(
      (r: Types.ObjectId) => r.toString() !== userId,
    );
    message.reactionTypes.delete(userId);

    return message.save();
  }

  async getMessageReads(messageId: string): Promise<MessageReadDocument[]> {
    return this.messageReadModel
      .find({ messageId: new Types.ObjectId(messageId) })
      .populate('userId', 'name avatar')
      .sort({ readAt: -1 })
      .exec();
  }

  async searchMessages(
    userId: string,
    searchQuery: string,
    limit: number = 20,
  ): Promise<MessageDocument[]> {
    // Get conversations user is part of
    const conversations = await this.conversationService.findUserConversations(
      userId,
      { page: 1, limit: 1000 }, // Get all conversations
    );

    const conversationIds = conversations.conversations.map((c) => c._id);

    return this.messageModel
      .find({
        conversationId: { $in: conversationIds },
        content: { $regex: searchQuery, $options: 'i' },
        deletedAt: { $exists: false },
        deletedFor: { $nin: [new Types.ObjectId(userId)] },
      })
      .populate('senderId', 'name avatar')
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  private async populateMessage(
    message: MessageDocument,
  ): Promise<MessageDocument | null> {
    return this.messageModel
      .findById(message._id)
      .populate('senderId', 'name avatar isVerified isPremium')
      .populate('replyToId')
      .exec();
  }

  async markAllAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messageReadModel.updateMany(
      { conversationId, userId },
      { $set: { readAt: new Date() } },
      { upsert: true },
    );
  }
}
