import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    // Validate the target user (the one being spoofed or the actual user)
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // If this is a spoofing session, also validate the original admin
    if (payload.isSpoofing && payload.originalUserId) {
      const adminUser = await this.usersService.findById(
        payload.originalUserId,
      );
      if (!adminUser || !adminUser.isAdmin || !adminUser.isActive) {
        throw new UnauthorizedException(
          'Original admin user not found or invalid',
        );
      }
    }

    // Return the payload with additional info for request context
    return {
      id: payload.sub,
      sub: payload.sub,
      userType: payload.userType,
      user: user,
      originalUserId: payload.originalUserId,
      isSpoofing: payload.isSpoofing,
    };
  }
}
