import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageReadDocument = MessageRead & Document;

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
export class MessageRead {
  _id?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true,
  })
  messageId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ default: Date.now })
  readAt: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;
}

export const MessageReadSchema = SchemaFactory.createForClass(MessageRead);

// Create compound indexes for efficient querying
MessageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });
MessageReadSchema.index({ conversationId: 1, userId: 1, readAt: -1 });
MessageReadSchema.index({ userId: 1, readAt: -1 });

// Sparse index for faster lookups
MessageReadSchema.index({ conversationId: 1, readAt: -1 });
