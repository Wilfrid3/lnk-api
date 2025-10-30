import * as admin from 'firebase-admin';
import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { SendVerificationDto } from './dto/send-verification.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { FirebaseService } from './firebase.service';
import { UsersService } from '../users/users.service';
import { safeToString } from '../utils/string.utils';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import {
  SendEmailVerificationDto,
  VerifyEmailDto,
} from './dto/email-verification.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MetricsService } from '../metrics/metrics.service';
import { StartSpoofingDto } from './dto/start-spoofing.dto';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private usersService: UsersService,
    private metricsService: MetricsService,
    private notificationsService: NotificationsService,
  ) {}

  private safeIdToString(id: any): string {
    if (!id) return '';
    return String(id);
  }

  /**
   * Helper method to combine first and last name from Google token
   */
  private combineNameFromGoogleToken(decodedToken: any): string {
    const firstName = decodedToken.given_name || '';
    const lastName = decodedToken.family_name || '';
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  @Public()
  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send verification code to phone number' })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async sendVerification(@Body() sendVerificationDto: SendVerificationDto) {
    return this.authService.sendVerificationCode(
      sendVerificationDto.phoneNumber,
      sendVerificationDto.countryCode,
    );
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'User already exists.' })
  async register(
    @Body() registerDto: RegisterDto,
    @Query('ref') inviteCode?: string,
  ) {
    try {
      const result = await this.authService.register(registerDto, inviteCode);
      this.metricsService.incrementAuthRequest('register', 'success');

      // Determine registration method
      const method = registerDto.email ? 'email' : 'phone';
      this.metricsService.incrementUserRegistration(method);

      // Send welcome notification asynchronously (non-blocking)
      if (result?.user?.id) {
        setImmediate(async () => {
          try {
            await this.notificationsService.sendWelcomeNotification(result.user.id);
          } catch (notificationError) {
            console.error('Failed to send welcome notification:', notificationError);
            // Don't fail the registration if notification fails
          }
        });
      }

      return result;
    } catch (error) {
      this.metricsService.incrementAuthRequest('register', 'failure');
      throw error;
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      this.metricsService.incrementAuthRequest('login', 'success');
      
      // Send welcome back notification asynchronously (non-blocking)
      if (result?.user?.id) {
        setImmediate(async () => {
          try {
            await this.notificationsService.sendWelcomeBackNotification(result.user.id);
          } catch (notificationError) {
            console.error('Failed to send welcome back notification:', notificationError);
            // Don't fail the login if notification fails
          }
        });
      }

      return result;
    } catch (error) {
      this.metricsService.incrementAuthRequest('login', 'failure');
      throw error;
    }
  }

  @Public()
  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone number with code' })
  @ApiResponse({
    status: 200,
    description: 'Phone number verified successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code.' })
  async verifyPhone(@Body() verifyPhoneDto: VerifyPhoneDto) {
    return this.authService.verifyPhone(verifyPhoneDto);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh authentication token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Request() req) {
    return req.user;
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Google ID token' })
  @ApiResponse({ status: 200, description: 'User authenticated successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async googleAuth(
    @Body() googleAuthDto: { idToken: string },
    @Query('ref') inviteCode?: string,
  ) {
    console.log('Google auth endpoint hit');

    try {
      // Validate input
      if (!googleAuthDto.idToken) {
        throw new BadRequestException('idToken is required');
      }

      // console.log('Attempting to verify Google token...');
      // Verify the Google ID token
      const decodedToken = await this.firebaseService.verifyGoogleIdToken(
        googleAuthDto.idToken,
      );
      // console.log('Token verified successfully');

      if (!decodedToken.email) {
        // console.log('Token has no email!', decodedToken);
        throw new BadRequestException('Google token must contain an email');
      }

      // Check if user exists with this email
      // console.log(`Looking for user with email: ${decodedToken.email}`);
      let user = await this.usersService.findByEmail(
        safeToString(decodedToken.email),
      );

      if (!user) {
        // Create new user if they don't exist
        console.log('User not found, creating new user...'); // Create a new user with combined name from Google token
        const name =
          decodedToken.name || this.combineNameFromGoogleToken(decodedToken);

        // Create user object with social login info
        const userData = {
          email: decodedToken.email,
          googleId: decodedToken.sub,
          name,
          avatar: decodedToken.picture ?? '',
          isEmailVerified: decodedToken.email_verified ?? false,
          authType: 'social', // Mark as social login
        };

        // Log the user creation attempt
        // console.log(
        //   'Creating new user with data:',
        //   JSON.stringify(userData, null, 2),
        // );

        try {
          user = await this.usersService.create(userData);
          console.log('User created successfully with ID:', user._id);

          // Process invite code if provided
          if (inviteCode && user._id) {
            try {
              await this.usersService.processInviteCode(
                inviteCode,
                user._id.toString(),
              );
            } catch (error) {
              // Log the error but don't fail authentication
              console.warn('Failed to process invite code:', error.message);
            }
          }
        } catch (error) {
          console.error('Error creating user:', error.message);
          if (error.name === 'ValidationError') {
            const validationErrors = Object.keys(error.errors)
              .map((field) => `${field}: ${error.errors[field].message}`)
              .join(', ');
            throw new BadRequestException(
              `Validation error: ${validationErrors}`,
            );
          }
          throw error;
        }
        console.log('New user created with ID:', user._id);
      } else if (!user.googleId) {
        // Update existing user with Google ID if needed
        // console.log('Updating existing user with Google ID...');
        const name =
          user.name ||
          decodedToken.name ||
          this.combineNameFromGoogleToken(decodedToken);

        // If the user was previously phone-authenticated, update to include social credentials
        const updateData = {
          googleId: decodedToken.sub,
          name,
          isEmailVerified: decodedToken.email_verified ?? user.isEmailVerified,
          avatar: user.avatar ?? decodedToken.picture ?? '',
          // Don't change authType if user already has phoneNumber,
          // otherwise update to 'social'
          authType: user.phoneNumber ? user.authType : 'social',
        };

        try {
          user = await this.usersService.update(String(user._id), updateData);
          console.log('User updated successfully with Google credentials');
        } catch (error) {
          console.error(
            'Error updating user with Google credentials:',
            error.message,
          );
          throw new Error(
            `Failed to update user with Google credentials: ${error.message}`,
          );
        }
      }

      // Generate tokens for the user
      console.log('Generating tokens for user:', user._id);
      const tokens = await this.authService.getTokensForUser(user);

      // Return user data and tokens
      return {
        user: this.authService.getUserInfo(user),
        ...tokens,
      };
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw new UnauthorizedException(
        'Invalid Google token: ' + (error.message || 'Unknown error'),
      );
    }
  }

  @Public()
  @Post('phone')
  async phoneAuth(@Body() body: { idToken: string }) {
    try {
      // Verify the Firebase ID token
      const decodedToken = await this.firebaseService.verifyIdToken(
        body.idToken,
      );

      // Ensure phone number is present
      if (!decodedToken.phone_number) {
        throw new BadRequestException('Phone number not found in token');
      }

      // Check if user exists by phone
      let user = await this.usersService.findByPhone(decodedToken.phone_number);

      if (!user) {
        // Create a new user if not found
        user = await this.usersService.create({
          phoneNumber: decodedToken.phone_number,
          firebaseUid: decodedToken.uid,
          isPhoneVerified: true,
        });
      } else {
        // Update existing user with Firebase UID if not already set
        if (!user.firebaseUid) {
          user = await this.usersService.update(safeToString(user._id), {
            firebaseUid: decodedToken.uid,
            isPhoneVerified: true,
          });
        }
      }

      // Generate auth tokens
      const tokens = await this.authService.getTokensForUser(user);

      return {
        ...tokens,
        user: this.authService.getUserInfo(user),
      };
    } catch (error) {
      throw new BadRequestException(
        `Phone authentication failed: ${error.message}`,
      );
    }
  }

  @Public()
  @Post('verify-token')
  async verifyToken(@Body() body: { idToken: string }) {
    try {
      // Verify the Firebase ID token
      const decodedToken = await this.firebaseService.verifyIdToken(
        body.idToken,
      );

      // Find user by Firebase UID
      const user = await this.usersService.findByFirebaseUid(decodedToken.uid);

      if (!user) {
        throw new BadRequestException('User not found for this token');
      }

      // Generate auth tokens
      const tokens = await this.authService.getTokensForUser(user);

      return {
        ...tokens,
        user: this.authService.getUserInfo(user),
      };
    } catch (error) {
      throw new BadRequestException(
        `Token verification failed: ${error.message}`,
      );
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user information' })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getCurrentUser(@Request() req: { user: { sub: string } }) {
    // req.user is set by the JWT auth guard
    const userId = req.user.sub;

    // Get the complete user information from the database
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return sanitized user data
    return this.authService.getUserInfo(user);
  }

  @Public()
  @Post('google/debug')
  @HttpCode(HttpStatus.OK)
  async debugGoogleAuth(@Body() body: { idToken: string }) {
    try {
      console.log('Debug endpoint hit');

      if (!body.idToken) {
        return {
          success: false,
          error: 'No token provided',
        };
      }

      console.log(
        `Received token (first 15 chars): ${body.idToken.substring(0, 15)}...`,
      );

      // Test Firebase initialization
      try {
        console.log('Checking Firebase connection...');
        // Check if admin is initialized
        const isInitialized = admin.apps.length > 0;
        console.log('Firebase initialized:', isInitialized);

        if (!isInitialized) {
          return {
            success: false,
            error: 'Firebase is not initialized',
          };
        }
      } catch (e) {
        console.error('Firebase connection check failed:', e);
        return {
          success: false,
          error: `Firebase connection error: ${e.message}`,
        };
      }

      // Try to verify token
      try {
        console.log('Attempting to verify token...');
        const decodedToken = await this.firebaseService.verifyGoogleIdToken(
          body.idToken,
        );

        return {
          success: true,
          tokenInfo: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            name: decodedToken.name,
            picture: decodedToken.picture ? 'Available' : 'Not available',
          },
        };
      } catch (e) {
        console.error('Token verification failed in debug endpoint:', e);
        return {
          success: false,
          error: `Token verification failed: ${e.message}`,
          hint: 'Check that you are sending the ID token (not the access token) and that your Firebase credentials are correct',
        };
      }
    } catch (error) {
      console.error('Debug endpoint error:', error);
      return {
        success: false,
        error: `Unexpected error: ${error.message}`,
      };
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and invalidate refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Request() req, @Body() logoutDto: LogoutDto) {
    // Use the user ID from the JWT token
    const userId = req.user.sub;
    return this.authService.logout(userId);
  }

  @Post('accept-terms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept terms and privacy policy' })
  @ApiResponse({
    status: 200,
    description: 'Terms and privacy policy accepted successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot revoke acceptance.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async acceptTerms(@Request() req, @Body() acceptTermsDto: AcceptTermsDto) {
    const userId = req.user.sub;
    return this.authService.acceptTermsAndPrivacy(
      userId,
      acceptTermsDto.accept,
    );
  }

  @Public()
  @Post('send-email-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send verification code to email address' })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async sendEmailVerification(
    @Body() sendEmailVerificationDto: SendEmailVerificationDto,
  ) {
    return this.authService.sendEmailVerificationCode(
      sendEmailVerificationDto.email,
    );
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with code' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.code,
    );
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 422, description: 'Current password is incorrect.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user.sub;
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('admin/start-spoofing')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start spoofing a user account (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Spoofing started successfully.',
  })
  @ApiResponse({ status: 403, description: 'Admin access required.' })
  @ApiResponse({ status: 404, description: 'Target user not found.' })
  async startSpoofing(
    @Request() req,
    @Body() startSpoofingDto: StartSpoofingDto,
  ) {
    const adminUserId = req.user.sub;
    return this.authService.startSpoofing(
      adminUserId,
      startSpoofingDto.targetUserId,
    );
  }

  @Post('admin/stop-spoofing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop spoofing and return to admin account' })
  @ApiResponse({
    status: 200,
    description: 'Spoofing stopped successfully.',
  })
  @ApiResponse({ status: 400, description: 'User is not currently spoofing.' })
  async stopSpoofing(@Request() req) {
    return this.authService.stopSpoofing(req.user);
  }

  @Get('admin/spoofing-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current spoofing status' })
  @ApiResponse({
    status: 200,
    description: 'Spoofing status retrieved successfully.',
  })
  getSpoofingStatus(@Request() req) {
    return this.authService.getSpoofingStatus(req.user);
  }
}
