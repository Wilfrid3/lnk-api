import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const method = request.method;
    const route = this.getRoutePattern(request);

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        const status = response.statusCode.toString();

        // Track HTTP request metrics
        this.metricsService.incrementHttpRequests(method, status, route);
        this.metricsService.recordHttpRequestDuration(method, route, duration);
      }),
    );
  }

  private getRoutePattern(request: Request): string {
    // Get the route pattern from the request
    const route = request.route?.path;
    if (route) {
      return route;
    }

    // Fallback to URL pathname with normalized parameters
    const url = request.url;
    // Remove query parameters
    const pathname = url.split('?')[0];

    // Normalize common patterns (IDs, UUIDs, etc.)
    return pathname
      .replace(/\/[a-f0-9]{24}/gi, '/:id') // MongoDB ObjectIds
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid') // UUIDs
      .replace(/\/\d+/g, '/:id'); // Numeric IDs
  }
}
