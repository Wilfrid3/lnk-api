import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ timestamps: true })
export class AnalyticsEvent {
  @Prop({ required: true })
  eventName: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  userId?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true })
  timestamp: Date;
}

export const AnalyticsEventSchema =
  SchemaFactory.createForClass(AnalyticsEvent);
