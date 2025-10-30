import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoCommentDocument = VideoComment & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class VideoComment {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, maxlength: 500, trim: true })
  content: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'VideoComment',
    default: null,
    index: true,
  })
  parentId: Types.ObjectId | null;

  @Prop({ default: 0, min: 0 })
  likes: number;

  @Prop({ default: 0, min: 0 })
  replies: number;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const VideoCommentSchema = SchemaFactory.createForClass(VideoComment);

// Indexes for performance
VideoCommentSchema.index({ videoId: 1, parentId: 1, createdAt: -1 });
VideoCommentSchema.index({ userId: 1, createdAt: -1 });
VideoCommentSchema.index({ parentId: 1, createdAt: 1 });
