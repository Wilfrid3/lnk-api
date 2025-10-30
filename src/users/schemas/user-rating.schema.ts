import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserRatingDocument = UserRating & Document;

@Schema({
  timestamps: true,
})
export class UserRating {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ratedUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  raterUserId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment?: string;
}

export const UserRatingSchema = SchemaFactory.createForClass(UserRating);

// Create compound index to prevent duplicate ratings
UserRatingSchema.index({ ratedUserId: 1, raterUserId: 1 }, { unique: true });
UserRatingSchema.index({ ratedUserId: 1 });
UserRatingSchema.index({ raterUserId: 1 });
