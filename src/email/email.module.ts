import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { EmailVerificationService } from './email-verification.service';
import {
  EmailVerification,
  EmailVerificationSchema,
} from './schemas/email-verification.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: EmailVerification.name, schema: EmailVerificationSchema },
    ]),
  ],
  providers: [EmailService, EmailVerificationService],
  exports: [EmailService, EmailVerificationService],
})
export class EmailModule {}
