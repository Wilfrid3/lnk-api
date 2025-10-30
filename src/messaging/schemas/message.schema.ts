import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export interface MessageMetadata {
  // Service-related
  servicePackageId?: string;
  serviceName?: string;
  price?: number;
  currency?: string;
  duration?: string;

  // File/Media
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;

  // Location
  latitude?: number;
  longitude?: number;
  address?: string;

  // Booking request
  requestedDate?: Date;
  requestedTime?: string;

  // System message data
  actionType?:
    | 'user_joined'
    | 'user_left'
    | 'group_created'
    | 'group_renamed'
    | 'admin_changed';
  actionUserId?: string;
  oldValue?: string;
  newValue?: string;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Message {
  _id?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({
    type: String,
    enum: [
      'text',
      'image',
      'file',
      'video',
      'audio',
      'service_offer',
      'booking_request',
      'location',
      'system',
    ],
    default: 'text',
  })
  type:
    | 'text'
    | 'image'
    | 'file'
    | 'video'
    | 'audio'
    | 'service_offer'
    | 'booking_request'
    | 'location'
    | 'system';

  @Prop({ type: Object })
  metadata?: MessageMetadata;

  @Prop({
    type: Map,
    of: Date,
    default: new Map(),
  })
  readBy: Map<string, Date>; // userId -> readAt timestamp

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
  })
  reactions: Types.ObjectId[]; // Users who reacted to this message

  @Prop({
    type: Map,
    of: String,
    default: new Map(),
  })
  reactionTypes: Map<string, string>; // userId -> reaction emoji

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  replyToId?: Types.ObjectId;

  @Prop()
  editedAt?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
  })
  deletedFor: Types.ObjectId[]; // Users for whom this message is deleted

  @Prop({ default: false })
  isForwarded: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  forwardedFromId?: Types.ObjectId;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Create indexes for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ 'metadata.servicePackageId': 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ deletedAt: 1 });
MessageSchema.index({ replyToId: 1 });

// Compound indexes for common queries
MessageSchema.index({ conversationId: 1, deletedAt: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, type: 1, createdAt: -1 });
