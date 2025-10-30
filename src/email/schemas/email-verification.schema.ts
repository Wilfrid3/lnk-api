import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailVerificationDocument = EmailVerification & Document;

@Schema({
  timestamps: true,
  collection: 'email_verifications',
})
export class EmailVerification {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 3 })
  maxAttempts: number;
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);

// Index for automatic document expiration
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient lookups
EmailVerificationSchema.index({ email: 1 });
EmailVerificationSchema.index({ code: 1 });
