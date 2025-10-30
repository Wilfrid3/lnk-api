import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get the full user data to check admin status
    // Check if this is an admin user or a spoofed admin
    const userId = user.originalUserId || user.sub;
    const fullUser = await this.usersService.findById(userId);

    if (!fullUser || !fullUser.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
