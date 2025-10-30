import { Module, Global } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status', 'route'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
    makeCounterProvider({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'result'],
    }),
    makeCounterProvider({
      name: 'video_cache_hits_total',
      help: 'Total number of video cache hits and misses',
      labelNames: ['type', 'cache_type'],
    }),
    makeGaugeProvider({
      name: 'active_video_streams',
      help: 'Number of currently active video streams',
      labelNames: [],
    }),
    // Health Check Metrics
    makeCounterProvider({
      name: 'health_checks_total',
      help: 'Total number of health check requests',
      labelNames: ['check_type', 'status'],
    }),
    makeHistogramProvider({
      name: 'health_check_duration_seconds',
      help: 'Health check duration in seconds',
      labelNames: ['check_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    }),
    makeGaugeProvider({
      name: 'database_connection_status',
      help: 'Database connection status (1=up, 0=down)',
      labelNames: ['database_type'],
    }),
    makeGaugeProvider({
      name: 'application_uptime_seconds',
      help: 'Application uptime in seconds',
      labelNames: [],
    }),
    // Authentication Metrics
    makeCounterProvider({
      name: 'auth_requests_total',
      help: 'Total number of authentication requests',
      labelNames: ['type', 'result'],
    }),
    makeCounterProvider({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['method'],
    }),
    // Database Operation Metrics
    makeCounterProvider({
      name: 'database_operations_total',
      help: 'Total number of database operations',
      labelNames: ['operation', 'collection', 'result'],
    }),
    makeHistogramProvider({
      name: 'database_operation_duration_seconds',
      help: 'Database operation duration in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    }),
    // Video Processing Metrics
    makeCounterProvider({
      name: 'video_uploads_total',
      help: 'Total number of video uploads',
      labelNames: ['status'],
    }),
    makeHistogramProvider({
      name: 'video_processing_duration_seconds',
      help: 'Video processing duration in seconds',
      labelNames: ['operation'],
      buckets: [1, 5, 10, 30, 60, 120],
    }),
    makeGaugeProvider({
      name: 'video_storage_bytes',
      help: 'Total video storage in bytes',
      labelNames: [],
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
