import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoLikeDocument = VideoLike & Document;

@Schema({ timestamps: true })
export class VideoLike {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
  videoId: Types.ObjectId;
}

export const VideoLikeSchema = SchemaFactory.createForClass(VideoLike);

// Create unique compound index to prevent duplicate likes
VideoLikeSchema.index({ userId: 1, videoId: 1 }, { unique: true });
VideoLikeSchema.index({ videoId: 1 });
VideoLikeSchema.index({ userId: 1 });
