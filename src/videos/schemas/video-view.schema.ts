import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoViewDocument = VideoView & Document;

@Schema({ timestamps: true })
export class VideoView {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId; // Optional for anonymous views

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
  videoId: Types.ObjectId;

  @Prop()
  ipAddress?: string; // For tracking unique anonymous views

  @Prop()
  userAgent?: string; // Browser/device info

  @Prop({ default: 0 })
  watchTime: number; // Watch time in seconds

  @Prop({ default: false })
  isCompleted: boolean; // Whether the video was watched completely
}

export const VideoViewSchema = SchemaFactory.createForClass(VideoView);

// Create indexes for analytics
VideoViewSchema.index({ videoId: 1, createdAt: -1 });
VideoViewSchema.index({ userId: 1, createdAt: -1 });
VideoViewSchema.index({ ipAddress: 1, videoId: 1 });
VideoViewSchema.index({ createdAt: -1 });
