import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(private readonly analyticsService: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { method, url, user } = request;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = user?.id || user?._id || 'anonymous';
    
    // Get user agent safely and check for Prometheus
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userAgent = String(request.headers?.['user-agent'] || '');
    const isPrometheusRequest = userAgent.includes('Prometheus');

    // Define categories based on URL patterns
    let category = 'api';
    const urlStr = String(url || '');
    if (urlStr.includes('/auth')) category = 'auth';
    else if (urlStr.includes('/users')) category = 'users';
    else if (urlStr.includes('/services')) category = 'services';
    else if (urlStr.includes('/messages')) category = 'messages';

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Skip analytics tracking for Prometheus requests
        if (isPrometheusRequest) {
          return;
        }

        // Only track successful responses
        const duration = Date.now() - startTime;
        const methodStr = String(method || 'UNKNOWN');
        const cleanUrl = urlStr.split('?')[0];
        
        void this.analyticsService.trackEvent(
          `${methodStr}_${cleanUrl}`,
          category,
          String(userId),
          {
            method: methodStr,
            url: urlStr,
            duration,
            userAgent,
          },
        );
      }),
    );
  }
}
