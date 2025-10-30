import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if Authorization header exists
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return true;
    }

    try {
      // Extract token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      // Attach user info to request
      request.user = {
        sub: payload.sub,
        email: payload.email,
        // Add other fields as needed
      };

      return true;
    } catch (error) {
      // Token is invalid, but continue without authentication
      console.log('Invalid JWT token in optional guard:', error.message);
      return true;
    }
  }
}
