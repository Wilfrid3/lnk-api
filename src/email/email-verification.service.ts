import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailService } from './email.service';
import {
  EmailVerification,
  EmailVerificationDocument,
} from './schemas/email-verification.schema';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerificationDocument>,
    private emailService: EmailService,
  ) {}

  /**
   * Generate and send a verification code to an email address
   */
  async sendVerificationCode(
    email: string,
    name?: string,
  ): Promise<{ message: string }> {
    // Generate 6-digit verification code
    const code = this.generateVerificationCode();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Remove any existing verification codes for this email
    await this.emailVerificationModel.deleteMany({ email });

    // Create new verification code record
    await this.emailVerificationModel.create({
      email,
      code,
      expiresAt,
    });

    // Send email
    const emailSent = await this.emailService.sendVerificationCode({
      email,
      code,
      name,
      expiresInMinutes: 10,
    });

    if (!emailSent) {
      throw new BadRequestException('Failed to send verification email');
    }

    return { message: 'Verification code sent to your email' };
  }

  /**
   * Verify an email verification code
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const verification = await this.emailVerificationModel.findOne({
      email,
      code,
      isUsed: false,
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Check if code has expired
    if (verification.expiresAt < new Date()) {
      await this.emailVerificationModel.deleteOne({ _id: verification._id });
      throw new UnauthorizedException('Verification code has expired');
    }

    // Check attempt limits
    if (verification.attempts >= verification.maxAttempts) {
      await this.emailVerificationModel.deleteOne({ _id: verification._id });
      throw new UnauthorizedException('Too many verification attempts');
    }

    // Mark as used
    await this.emailVerificationModel.updateOne(
      { _id: verification._id },
      {
        isUsed: true,
        $inc: { attempts: 1 },
      },
    );

    // Clean up used verification codes for this email
    await this.emailVerificationModel.deleteMany({
      email,
      isUsed: true,
    });

    return true;
  }

  /**
   * Check if a verification code exists for an email (for testing/debugging)
   */
  async hasValidCode(email: string): Promise<boolean> {
    const verification = await this.emailVerificationModel.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    return !!verification;
  }

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Clean up expired verification codes (can be called periodically)
   */
  async cleanupExpiredCodes(): Promise<void> {
    await this.emailVerificationModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}
