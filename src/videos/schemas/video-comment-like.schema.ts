import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoCommentLikeDocument = VideoCommentLike & Document;

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
export class VideoCommentLike {
  @Prop({
    type: Types.ObjectId,
    ref: 'VideoComment',
    required: true,
    index: true,
  })
  commentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Date })
  createdAt: Date;
}

export const VideoCommentLikeSchema =
  SchemaFactory.createForClass(VideoCommentLike);

// Compound unique index to prevent duplicate likes
VideoCommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });
VideoCommentLikeSchema.index({ userId: 1, createdAt: -1 });
