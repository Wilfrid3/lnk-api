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
import {
  Conversation,
  ConversationDocument,
} from '../schemas/conversation.schema';
import { Message, MessageDocument } from '../schemas/message.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { MessagingGateway } from '../gateways/messaging.gateway';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationQueryDto,
} from '../dto/conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => MessagingGateway))
    private messagingGateway: MessagingGateway,
  ) {}

  async create(
    createConversationDto: CreateConversationDto,
    userId: string,
  ): Promise<ConversationDocument> {
    const { participants, type, groupName, groupAvatar } =
      createConversationDto;

    // Validate participants - make a copy to avoid mutating the original
    const allParticipants = [...participants];

    // Add current user if not already included
    if (!allParticipants.includes(userId)) {
      allParticipants.push(userId);
    }

    // For direct conversations, ensure only 2 participants
    if (type === 'direct' && allParticipants.length !== 2) {
      throw new BadRequestException(
        'Direct conversations must have exactly 2 participants',
      );
    }

    // For group conversations, ensure group name is provided
    if (type === 'group' && !groupName) {
      throw new BadRequestException(
        'Group name is required for group conversations',
      );
    }

    // Check if direct conversation already exists
    if (type === 'direct') {
      const existingConversation = await this.conversationModel.findOne({
        type: 'direct',
        participants: { $all: allParticipants, $size: 2 },
        isActive: true,
      });

      if (existingConversation) {
        return existingConversation;
      }
    }

    // Verify all participants exist
    const existingUsers = await this.userModel.find({
      _id: { $in: allParticipants.map((id) => new Types.ObjectId(id)) },
    });
    // console.log('Existing users: ==>> ', existingUsers, allParticipants, existingUsers.length, allParticipants.length);

    if (existingUsers.length !== allParticipants.length) {
      throw new BadRequestException('One or more participants do not exist');
    }

    const conversation = new this.conversationModel({
      participants: allParticipants.map((id) => new Types.ObjectId(id)),
      type,
      groupName,
      groupAvatar,
      groupAdmin: type === 'group' ? new Types.ObjectId(userId) : undefined,
      unreadCounts: new Map(),
      archivedBy: new Map(),
      deletedBy: new Map(),
    });

    const savedConversation = await conversation.save();

    // Notify all participants about the new conversation
    console.log(
      `💬 ConversationService: Calling notifyNewConversation for conversation ${savedConversation._id}, participants: ${savedConversation.participants.length}`,
    );
    await this.messagingGateway.notifyNewConversation(savedConversation);
    console.log(
      `✅ ConversationService: notifyNewConversation completed for conversation ${savedConversation._id}`,
    );

    return savedConversation;
  }

  async findUserConversations(
    userId: string,
    query: ConversationQueryDto,
  ): Promise<{
    conversations: ConversationDocument[];
    pagination: any;
  }> {
    const { page = 1, limit = 20, type, search, archived = false } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
      participants: new Types.ObjectId(userId),
      isActive: true,
    };

    // Handle archived filter
    if (archived) {
      filter[`archivedBy.${userId}`] = { $exists: true };
    } else {
      filter[`archivedBy.${userId}`] = { $exists: false };
    }

    // Handle deleted filter
    filter[`deletedBy.${userId}`] = { $exists: false };

    if (type) {
      filter.type = type;
    }

    // Build aggregation pipeline for search
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participantDetails',
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { groupName: { $regex: search, $options: 'i' } },
            {
              'participantDetails.name': { $regex: search, $options: 'i' },
            },
          ],
        },
      });
    }

    // Add sorting, pagination
    pipeline.push(
      { $sort: { lastMessageAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'messages',
          let: { conversationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$conversationId', '$$conversationId'] },
                deletedAt: { $exists: false },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'senderId',
                foreignField: '_id',
                as: 'sender',
              },
            },
            { $unwind: '$sender' },
          ],
          as: 'lastMessageDetails',
        },
      },
    );

    const conversations = await this.conversationModel.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [...pipeline.slice(0, -3)]; // Remove sort, skip, limit, lookup
    const totalResult = await this.conversationModel.aggregate([
      ...totalPipeline,
      { $count: 'total' },
    ]);

    const totalCount = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      conversations,
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

  async findById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        participants: new Types.ObjectId(userId),
        isActive: true,
        [`deletedBy.${userId}`]: { $exists: false },
      })
      .populate('participants', 'name avatar isVerified isPremium')
      .populate('groupAdmin', 'name avatar');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async update(
    conversationId: string,
    updateConversationDto: UpdateConversationDto,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId, userId);

    // Check if user is admin for group operations
    if (
      conversation.type === 'group' &&
      conversation.groupAdmin?.toString() !== userId
    ) {
      throw new ForbiddenException(
        'Only group admin can update group settings',
      );
    }

    const updateData: any = {};

    if (updateConversationDto.groupName) {
      updateData.groupName = updateConversationDto.groupName;
    }

    if (updateConversationDto.groupAvatar) {
      updateData.groupAvatar = updateConversationDto.groupAvatar;
    }

    if (updateConversationDto.groupAdmin) {
      if (
        !conversation.participants.includes(
          updateConversationDto.groupAdmin as any,
        )
      ) {
        throw new BadRequestException(
          'New admin must be a participant in the conversation',
        );
      }
      updateData.groupAdmin = new Types.ObjectId(
        updateConversationDto.groupAdmin,
      );
    }

    if (updateConversationDto.addParticipants) {
      const newParticipants = updateConversationDto.addParticipants.map(
        (id) => new Types.ObjectId(id),
      );
      updateData.$addToSet = { participants: { $each: newParticipants } };
    }

    if (updateConversationDto.removeParticipants) {
      const removeParticipants = updateConversationDto.removeParticipants.map(
        (id) => new Types.ObjectId(id),
      );
      updateData.$pull = { participants: { $in: removeParticipants } };
    }

    updateData.updatedAt = new Date();

    const updatedConversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found');
    }

    return updatedConversation;
  }

  async archive(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.findById(conversationId, userId);

    conversation.archivedBy.set(userId, new Date());
    await conversation.save();
  }

  async unarchive(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.findById(conversationId, userId);

    conversation.archivedBy.delete(userId);
    await conversation.save();
  }

  async delete(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.findById(conversationId, userId);

    conversation.deletedBy.set(userId, new Date());
    await conversation.save();
  }

  async getUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<number> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation.unreadCounts.get(userId) || 0;
  }

  async updateUnreadCount(
    conversationId: string,
    userId: string,
    count: number,
  ): Promise<void> {
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      [`unreadCounts.${userId}`]: count,
    });
  }

  async resetUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $unset: { [`unreadCounts.${userId}`]: '' },
    });
  }

  async updateLastMessage(
    conversationId: string,
    content: string,
  ): Promise<void> {
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: content,
      lastMessageAt: new Date(),
    });
  }

  async incrementUnreadCount(
    conversationId: string,
    excludeUserId: string,
  ): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) return;

    // Increment unread count for all participants except the sender
    for (const participantId of conversation.participants) {
      if (participantId.toString() !== excludeUserId) {
        const currentCount =
          conversation.unreadCounts.get(participantId.toString()) || 0;
        conversation.unreadCounts.set(
          participantId.toString(),
          currentCount + 1,
        );
      }
    }

    await conversation.save();
  }
}
