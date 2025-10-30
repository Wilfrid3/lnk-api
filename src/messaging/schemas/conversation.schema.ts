import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

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
export class Conversation {
  _id?: Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
    validate: [
      arrayLimit,
      'Participants must have at least 2 users and max 50 for group chats',
    ],
  })
  participants: Types.ObjectId[];

  @Prop({
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
  })
  type: 'direct' | 'group';

  @Prop()
  groupName?: string;

  @Prop()
  groupAvatar?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  groupAdmin?: Types.ObjectId;

  @Prop()
  lastMessage?: string;

  @Prop({ default: Date.now })
  lastMessageAt: Date;

  @Prop({
    type: Map,
    of: Number,
    default: new Map(),
  })
  unreadCounts: Map<string, number>; // userId -> unread count

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: Map,
    of: Date,
    default: new Map(),
  })
  archivedBy: Map<string, Date>; // userId -> archivedAt timestamp

  @Prop({
    type: Map,
    of: Date,
    default: new Map(),
  })
  deletedBy: Map<string, Date>; // userId -> deletedAt timestamp
}

// Validation function for participants array
function arrayLimit(val: Types.ObjectId[]) {
  return val.length >= 2 && val.length <= 50;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Create indexes
ConversationSchema.index({ participants: 1, updatedAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ isActive: 1 });

// Virtual for participant count
ConversationSchema.virtual('participantCount').get(function () {
  return this.participants.length;
});
