import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VerificationCodeDocument = VerificationCode & Document;

@Schema({ timestamps: true })
export class VerificationCode {
  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true, default: 'FR' })
  countryCode: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: Date, default: Date.now, expires: 3600 }) // TTL index - expires after 1 hour
  createdAt: Date;
}

export const VerificationCodeSchema =
  SchemaFactory.createForClass(VerificationCode);
