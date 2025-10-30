import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  VerificationCode,
  VerificationCodeDocument,
} from './schemas/verification-code.schema';
import * as twilio from 'twilio';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);
  private readonly twilioClient: twilio.Twilio;
  private readonly verifyServiceSid?: string;

  constructor(
    @InjectModel(VerificationCode.name)
    private readonly verificationCodeModel: Model<VerificationCodeDocument>,
    private readonly configService: ConfigService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.verifyServiceSid = this.configService.get<string>(
      'TWILIO_VERIFY_SERVICE_SID',
    );

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      if (!this.verifyServiceSid) {
        this.logger.warn(
          'Twilio Verify Service SID not found. SMS verification will not work properly.',
        );
      }
    } else {
      this.logger.warn('Twilio credentials not found. SMS will not be sent.');
    }
  }

  async sendVerificationCode(
    phoneNumber: string,
    countryCode: string = 'CM',
  ): Promise<string> {
    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save the code to the database
    await this.verificationCodeModel.create({
      phoneNumber,
      countryCode,
      code,
    });

    // Send the verification code via Twilio Verify API with custom code
    try {
      if (this.twilioClient && this.verifyServiceSid) {
        await this.twilioClient.verify.v2
          .services(this.verifyServiceSid)
          .verifications.create({
            to: phoneNumber,
            channel: 'sms',
            customCode: code,
          });

        this.logger.log(
          `Verification initiated with custom code to ${phoneNumber}`,
        );
      } else {
        // For development or when Twilio is not configured, just log the code
        this.logger.log(
          `Verification code for ${phoneNumber}: ${code} (Twilio Verify not configured, SMS not sent)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send verification to ${phoneNumber}: ${error.message || 'Unknown error'}`,
      );
      // We still return the code even if SMS fails, so the app can continue in development
    }

    return code;
  }

  async verifyCode(
    phoneNumber: string,
    code: string,
    countryCode: string = 'CM',
  ): Promise<boolean> {
    try {
      // First check our database to see if this is a valid code
      const verification = await this.verificationCodeModel.findOne({
        phoneNumber,
        code,
        countryCode,
        verified: false,
      });

      if (!verification) {
        this.logger.warn(
          `Invalid verification code attempt for ${phoneNumber}`,
        );
        return false;
      }

      // If we have Twilio configured, verify through their API
      if (this.twilioClient && this.verifyServiceSid) {
        try {
          const verificationCheck = await this.twilioClient.verify.v2
            .services(this.verifyServiceSid)
            .verificationChecks.create({
              to: phoneNumber,
              code: code,
            });

          const isValid = verificationCheck.status === 'approved';

          if (isValid) {
            // Mark the code as verified in our database
            verification.verified = true;
            await verification.save();
            this.logger.log(`Phone verification successful for ${phoneNumber}`);
          } else {
            this.logger.warn(
              `Phone verification failed for ${phoneNumber}: ${verificationCheck.status}`,
            );
          }

          return isValid;
        } catch (twilioError) {
          // If Twilio verification fails, fallback to our database verification
          this.logger.error(
            `Twilio verification check failed: ${twilioError.message ?? 'Unknown error'}`,
          );
          // Continue with database verification
        }
      }

      // Fallback to database verification if Twilio is not configured or failed
      verification.verified = true;
      await verification.save();

      this.logger.log(
        `Phone verification successful (database only) for ${phoneNumber}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error in verification process: ${error.message ?? 'Unknown error'}`,
      );
      return false;
    }
  }
}
