import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export type PostFileDocument = PostFile & Document & { _id: Types.ObjectId };

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class PostFile {
  @ApiProperty({ description: 'Original filename' })
  @Prop({ required: true })
  originalName: string;

  @ApiProperty({ description: 'File path on server' })
  @Prop({ required: true })
  path: string;

  @ApiProperty({ description: 'Public URL to access the file' })
  @Prop({ required: true })
  url: string;

  @ApiProperty({ description: 'MIME type of the file' })
  @Prop({ required: true })
  mimeType: string;

  @ApiProperty({ description: 'Size of the file in bytes' })
  @Prop({ required: true })
  size: number;

  @ApiProperty({ description: 'Type of file (image or video)', enum: FileType })
  @Prop({ required: true, enum: FileType })
  fileType: FileType;

  @ApiProperty({
    description: 'Duration in seconds (for videos only)',
    required: false,
  })
  @Prop({ required: false })
  duration?: number;

  @ApiProperty({
    description: 'The post this file belongs to (if associated with a post)',
  })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Post', required: false })
  postId?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'User who uploaded this file' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;
}

export const PostFileSchema = SchemaFactory.createForClass(PostFile);
