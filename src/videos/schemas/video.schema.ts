import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoDocument = Video & Document;

@Schema({ timestamps: true })
export class Video {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  fileName: string; // Original uploaded filename

  @Prop({ required: true })
  filePath: string; // Path to video file

  @Prop({ required: true })
  fileSize: number; // File size in bytes

  @Prop({ required: true })
  mimeType: string; // video/mp4, video/webm, etc.

  @Prop()
  thumbnailPath?: string; // Path to thumbnail file

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  duration: number; // Duration in seconds

  @Prop()
  width?: number; // Video width in pixels

  @Prop()
  height?: number; // Video height in pixels

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  shares: number;

  @Prop({ default: 0 })
  comments: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: false })
  isProcessing: boolean; // For video processing status

  @Prop([String])
  tags: string[];

  @Prop()
  location?: string;

  @Prop({ default: 'public' })
  privacy: 'public' | 'private' | 'friends';

  // Quality versions (future feature)
  @Prop({
    type: {
      '360p': String,
      '720p': String,
      '1080p': String,
    },
    default: {},
  })
  qualityVersions: {
    '360p'?: string;
    '720p'?: string;
    '1080p'?: string;
  };
}

export const VideoSchema = SchemaFactory.createForClass(Video);

// Create indexes for performance
VideoSchema.index({ userId: 1 });
VideoSchema.index({ createdAt: -1 });
VideoSchema.index({ views: -1 });
VideoSchema.index({ likes: -1 });
VideoSchema.index({ tags: 1 });
VideoSchema.index({ isActive: 1, createdAt: -1 });
