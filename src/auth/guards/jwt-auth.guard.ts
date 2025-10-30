import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public endpoints, try to process JWT if present but don't fail if missing/invalid
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const request = context.switchToHttp().getRequest();
      const authHeader = (request as { headers?: { authorization?: string } })
        .headers?.authorization;

      if (authHeader?.startsWith('Bearer ')) {
        // Token is present, try to validate it
        const result = super.canActivate(context);

        // Handle async results
        if (result instanceof Promise) {
          return result.catch((err: Error) => {
            console.log(
              'JWT validation failed for public endpoint, allowing access:',
              err.message,
            );
            return true;
          });
        } else if (result instanceof Observable) {
          return result.pipe(
            map(() => true),
            catchError((err: Error) => {
              console.log(
                'JWT validation failed for public endpoint, allowing access:',
                err.message,
              );
              return of(true);
            }),
          );
        }
        return result;
      }

      // No token present, that's ok for public endpoints
      return true;
    }

    // For non-public endpoints, use normal authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If endpoint is public, never throw errors
    if (isPublic) {
      if (user && typeof user === 'object' && 'userId' in user) {
        console.log(
          'JWT user extracted for public endpoint:',
          (user as { userId: string }).userId,
        );
      } else {
        // console.log(
        //   'No JWT user for public endpoint, proceeding unauthenticated',
        // );
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return user ?? null;
    }

    // For non-public endpoints, use default behavior (will throw if no user)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return super.handleRequest(err, user, info, context);
  }
}
