import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PhoneVerificationService } from './phone-verification.service';
import { EmailVerificationService } from '../email/email-verification.service';
import { EmailService } from '../email/email.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Document } from 'mongoose';
import { JwtPayload, SpoofingStatus } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly phoneVerificationService: PhoneVerificationService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly emailService: EmailService,
  ) {}
  async sendVerificationCode(
    phoneNumber: string,
    countryCode: string = 'CM',
  ): Promise<{ message: string }> {
    await this.phoneVerificationService.sendVerificationCode(
      phoneNumber,
      countryCode,
    );
    return { message: 'Verification code sent successfully' };
  }

  async sendEmailVerificationCode(email: string): Promise<{ message: string }> {
    // Find user by email to get their name
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.emailVerificationService.sendVerificationCode(email, user.name);
    return { message: 'Email verification code sent successfully' };
  }

  async verifyEmail(email: string, code: string): Promise<any> {
    // Verify the code
    const isCodeValid = await this.emailVerificationService.verifyCode(
      email,
      code,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Find the user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mark email as verified
    const userId =
      user._id instanceof Document ? user._id.toString() : String(user._id);
    const updatedUser = await this.usersService.markEmailAsVerified(userId);

    // Generate tokens
    const tokens = await this.getTokens(updatedUser);

    // Store refresh token
    await this.storeRefreshToken(updatedUser, tokens.refreshToken);

    return {
      ...tokens,
      message: 'Email verified successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }

  async verifyPhoneAndLogin(
    phoneNumber: string,
    code: string,
  ): Promise<{ accessToken: string; user: any }> {
    const isCodeValid = await this.phoneVerificationService.verifyCode(
      phoneNumber,
      code,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Find user or create if not exists
    let user = await this.usersService.findByPhone(phoneNumber);

    if (!user) {
      user = await this.usersService.create({
        phoneNumber,
        isPhoneVerified: true,
      });
    } else {
      // Update phone verification status if needed
      if (!user.isPhoneVerified) {
        // Access id from Document
        const userId =
          user._id instanceof Document ? user._id.toString() : String(user._id);
        await this.usersService.markPhoneAsVerified(userId);
      }
    }

    // Access id from Document
    const userId =
      user._id instanceof Document ? user._id.toString() : String(user._id);
    const payload = { sub: userId };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        _id: userId,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
      },
    };
  }

  async login(loginDto: any): Promise<any> {
    let user: UserDocument | null = null;

    // Find user by phone or email
    if (loginDto.phoneNumber) {
      user = await this.usersService.findByPhone(loginDto.phoneNumber);
    } else if (loginDto.email) {
      user = await this.usersService.findByEmail(loginDto.email);
    } else {
      throw new BadRequestException('Email or phone number is required');
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If using password authentication
    if (loginDto.password) {
      if (!user.password) {
        throw new UnauthorizedException(
          'Password authentication not set up for this user',
        );
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // Generate tokens
    const tokens = await this.getTokens(user);

    // Store the refresh token
    await this.storeRefreshToken(user, tokens.refreshToken);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refreshToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.getUserByRefreshToken(token);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.getTokens(user);

      // Update the stored refresh token
      await this.storeRefreshToken(user, tokens.refreshToken);

      return {
        ...tokens,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateJwtPayload(payload: any): Promise<UserDocument> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return user;
  }

  async register(registerDto: any, inviteCode?: string): Promise<any> {
    // Check if user exists with this phone or email
    const existingUserByEmail = await this.usersService.findByEmail(
      registerDto.email,
    );
    if (existingUserByEmail) {
      throw new BadRequestException('Email already registered');
    }

    if (registerDto.phoneNumber) {
      const existingUserByPhone = await this.usersService.findByPhone(
        registerDto.phoneNumber,
      );
      if (existingUserByPhone) {
        throw new BadRequestException('Phone Number already registered');
      }
    }

    // Hash password if provided
    if (registerDto.password) {
      registerDto.password = await this.hashPassword(registerDto.password);
    }

    // Create new user
    const user = await this.usersService.create({
      ...registerDto,
      isEmailVerified: false,
    });

    // Process invite code if provided
    if (inviteCode && user._id) {
      try {
        await this.usersService.processInviteCode(
          inviteCode,
          user._id.toString(),
        );
      } catch (error) {
        // Log the error but don't fail registration
        console.warn('Failed to process invite code:', error.message);
      }
    }

    // Generate verification codes
    const verificationMessages: string[] = [];

    // Send email verification code
    try {
      await this.emailVerificationService.sendVerificationCode(registerDto.email, registerDto.name);
      verificationMessages.push('Email verification code sent');
    } catch (error) {
      console.error('Failed to send email verification code:', error.message);
    }

    // Send email verification code if email is provided
    if (registerDto.phoneNumber) {
      try {
        await this.sendVerificationCode(
          registerDto.phoneNumber
        );
        verificationMessages.push('Phone verification code sent');
      } catch (error) {
        console.error('Failed to send email verification code:', error.message);
      }
    } else {
      verificationMessages.push(
        'No Phone provided, skipping phone verification',
      );
      // log the message but don't throw an error
      console.warn('No phone provided, skipping phone verification');
    }

    const message =
      verificationMessages.length > 0
        ? `User registered successfully. ${verificationMessages.join(', ')}.`
        : 'User registered successfully.';

    return {
      message,
      user: this.sanitizeUser(user),
    };
  }
  async verifyPhone(verifyPhoneDto: any): Promise<any> {
    const { phoneNumber, code, countryCode } = verifyPhoneDto;

    // Verify the code
    const isCodeValid = await this.phoneVerificationService.verifyCode(
      phoneNumber,
      code,
      countryCode,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Find the user
    const user = await this.usersService.findByPhone(phoneNumber);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mark phone as verified
    // Access id from Document
    const userId =
      user._id instanceof Document ? user._id.toString() : String(user._id);
    await this.usersService.markPhoneAsVerified(userId);

    // Generate tokens
    const tokens = await this.getTokens(user);

    // Store refresh token
    await this.storeRefreshToken(user, tokens.refreshToken);

    return {
      ...tokens,
      message: 'Phone number verified successfully',
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Invalidates a user's refresh token on logout
   */
  async logout(userId: string): Promise<{ success: boolean }> {
    try {
      // Remove the refresh token from the user document
      await this.usersService.removeRefreshToken(userId);
      return { success: true };
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Update the user's acceptance of terms and privacy policy
   */
  async acceptTermsAndPrivacy(userId: string, accept: boolean): Promise<any> {
    try {
      // Find the user
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // If trying to unaccept terms that were previously accepted, disallow
      if (user.acceptedTermsAndPrivacy && !accept) {
        throw new ForbiddenException(
          'Cannot revoke acceptance of terms and privacy policy',
        );
      }

      // Update the user's acceptance status
      const updatedUser = await this.usersService.update(userId, {
        acceptedTermsAndPrivacy: accept,
      });

      // Return sanitized user data
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update terms acceptance: ${error.message}`,
      );
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Find the user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a password set
    if (!user.password) {
      throw new BadRequestException(
        'Password not set. Please set up password authentication first.',
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnprocessableEntityException('Current password is incorrect');
    }

    // Hash the new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Update the user's password
    await this.usersService.update(userId, {
      password: hashedNewPassword,
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    // Find the user by email
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.email) {
      // For security reasons, don't reveal if email exists or not
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    // Generate password reset token (JWT with short expiration)
    const userId =
      user._id instanceof Document ? user._id.toString() : String(user._id);
    const resetToken = this.jwtService.sign(
      {
        sub: userId,
        type: 'password_reset',
        email: user.email,
      },
      { expiresIn: '30m' }, // 30 minutes expiration
    );

    // Generate reset link
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail({
        email: user.email,
        resetLink,
        name: user.name,
        expiresInMinutes: 30,
      });
    } catch (error) {
      // Log error but don't expose it to user for security
      console.error('Failed to send password reset email:', error);
    }

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      // Verify and decode the reset token
      const payload = this.jwtService.verify(token);

      // Check if token is of correct type
      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token');
      }

      // Find the user
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.email) {
        throw new NotFoundException('User not found');
      }

      // Verify email matches (extra security check)
      if (user.email !== payload.email) {
        throw new BadRequestException('Invalid reset token');
      }

      // Hash the new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update the user's password
      await this.usersService.update(payload.sub, {
        password: hashedNewPassword,
      });

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      throw error;
    }
  }

  // Add these public methods to expose the private methods  // Exposed wrapper for the private generateTokens method
  public async getTokensForUser(user: any): Promise<any> {
    return this.generateTokens(user);
  }
  // Public method to expose the sanitizeUser functionality
  public getUserInfo(user: any): any {
    // If the method already exists, no need to add it again
    // This is just to ensure it's defined correctly
    if (!user) return null;

    // Return sanitized user data without sensitive information
    return {
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      countryCode: user.countryCode,
      name: user.name,
      avatar: user.avatar,
      coverImage: user.coverImage,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      userType: user.userType,
      age: user.age,
      bio: user.bio,
      // Preferences and rates fields
      clientType: user.clientType,
      appearance: user.appearance,
      offerings: user.offerings,
      hourlyRate: user.hourlyRate,
      halfDayRate: user.halfDayRate,
      fullDayRate: user.fullDayRate,
      weekendRate: user.weekendRate,
      availabilityHours: user.availabilityHours,
      specialServices: user.specialServices,
      paymentMethods: user.paymentMethods,
      additionalNotes: user.additionalNotes,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      inviteCode: user.inviteCode,
      inviteRewards: user.inviteRewards,
    };
  }

  private async getTokens(
    user: UserDocument,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Access id from Document
    const userId =
      user._id instanceof Document ? user._id.toString() : String(user._id);
    const payload = {
      sub: userId,
      userType: user.userType,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        payload,
        { expiresIn: '7d' }, // longer expiry for refresh token
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async storeRefreshToken(
    user: UserDocument,
    refreshToken: string,
  ): Promise<void> {
    // Access id from Document
    const userId =
      user._id instanceof Document ? user._id.toString() : String(user._id);
    await this.usersService.storeRefreshToken(userId, refreshToken);
  }

  private sanitizeUser(user: UserDocument): any {
    // Convert mongoose document to plain object if needed
    const result = user.toObject ? user.toObject() : { ...user };

    // Remove sensitive fields
    delete result.password;
    delete result.refreshToken;

    return result;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private async generateTokens(user: UserDocument) {
    // Access id from Document
    const userId =
      user._id instanceof Document ? user._id.toString() : String(user._id);
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Start spoofing a user (admin only)
   */
  async startSpoofing(
    adminUserId: string,
    targetUserId: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // Verify admin user
    const adminUser = await this.usersService.findById(adminUserId);
    if (!adminUser || !adminUser.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    // Get target user
    const targetUser = await this.usersService.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Prevent spoofing other admins
    if (targetUser.isAdmin) {
      throw new ForbiddenException('Cannot spoof other admin users');
    }

    // Generate tokens with spoofing payload
    const targetUserIdStr =
      targetUser._id instanceof Document
        ? targetUser._id.toString()
        : String(targetUser._id);
    const adminUserIdStr =
      adminUser._id instanceof Document
        ? adminUser._id.toString()
        : String(adminUser._id);

    const payload: JwtPayload = {
      sub: targetUserIdStr,
      userType: targetUser.userType,
      originalUserId: adminUserIdStr, // Track the original admin
      isSpoofing: true,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        ...this.getUserInfo(targetUser),
        isSpoofing: true,
        originalAdminId: adminUserIdStr,
      },
    };
  }

  /**
   * Stop spoofing and return to admin account
   */
  async stopSpoofing(
    currentPayload: JwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    if (!currentPayload.isSpoofing || !currentPayload.originalUserId) {
      throw new BadRequestException('User is not currently spoofing');
    }

    // Get the original admin user
    const adminUser = await this.usersService.findById(
      currentPayload.originalUserId,
    );
    if (!adminUser || !adminUser.isAdmin) {
      throw new UnauthorizedException('Original admin user not found');
    }

    // Generate tokens for the admin user
    const tokens = await this.getTokens(adminUser);

    return {
      ...tokens,
      user: {
        ...this.getUserInfo(adminUser),
        isSpoofing: false,
      },
    };
  }

  /**
   * Get current spoofing status
   */
  getSpoofingStatus(payload: JwtPayload): SpoofingStatus {
    return {
      isSpoofing: !!payload.isSpoofing,
      originalAdminId: payload.originalUserId,
      targetUserId: payload.isSpoofing ? payload.sub : undefined,
    };
  }
}
