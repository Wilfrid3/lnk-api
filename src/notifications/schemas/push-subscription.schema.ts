import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PushSubscriptionDocument = PushSubscription & Document;

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
export class PushSubscription {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: String })
  userId: string;

  @Prop({ required: true, type: String })
  endpoint: string;

  @Prop({ required: true, type: String })
  p256dh: string;

  @Prop({ required: true, type: String })
  auth: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  lastUsed: Date;

  // Timestamps are handled by the schema
  createdAt?: Date;
  updatedAt?: Date;
}

export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);

// Create compound index for userId and endpoint to prevent duplicates
PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

// Create index for efficient queries
PushSubscriptionSchema.index({ userId: 1 });
PushSubscriptionSchema.index({ isActive: 1 });
