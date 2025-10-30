import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    // HTTP Metrics
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,

    // Redis Metrics
    @InjectMetric('redis_operations_total')
    private readonly redisOperationsCounter: Counter<string>,

    // Video Metrics
    @InjectMetric('video_cache_hits_total')
    private readonly videoCacheHitsCounter: Counter<string>,

    @InjectMetric('active_video_streams')
    private readonly activeVideoStreamsGauge: Gauge<string>,

    @InjectMetric('video_uploads_total')
    private readonly videoUploadsCounter: Counter<string>,

    @InjectMetric('video_processing_duration_seconds')
    private readonly videoProcessingDuration: Histogram<string>,

    @InjectMetric('video_storage_bytes')
    private readonly videoStorageGauge: Gauge<string>,

    // Health Check Metrics
    @InjectMetric('health_checks_total')
    private readonly healthChecksCounter: Counter<string>,

    @InjectMetric('health_check_duration_seconds')
    private readonly healthCheckDuration: Histogram<string>,

    @InjectMetric('database_connection_status')
    private readonly databaseConnectionGauge: Gauge<string>,

    @InjectMetric('application_uptime_seconds')
    private readonly applicationUptimeGauge: Gauge<string>,

    // Authentication Metrics
    @InjectMetric('auth_requests_total')
    private readonly authRequestsCounter: Counter<string>,

    @InjectMetric('user_registrations_total')
    private readonly userRegistrationsCounter: Counter<string>,

    // Database Operation Metrics
    @InjectMetric('database_operations_total')
    private readonly databaseOperationsCounter: Counter<string>,

    @InjectMetric('database_operation_duration_seconds')
    private readonly databaseOperationDuration: Histogram<string>,
  ) {}

  // HTTP Metrics
  incrementHttpRequests(method: string, status: string, route: string) {
    this.httpRequestsCounter.labels(method, status, route).inc();
  }

  recordHttpRequestDuration(method: string, route: string, duration: number) {
    this.httpRequestDuration.labels(method, route).observe(duration);
  }

  // Redis Metrics
  incrementRedisOperation(operation: string, result: 'success' | 'error') {
    this.redisOperationsCounter.labels(operation, result).inc();
  }

  // Video Cache Metrics
  incrementVideoCacheHit(type: 'hit' | 'miss', cache_type: string) {
    this.videoCacheHitsCounter.labels(type, cache_type).inc();
  }

  // Video Streaming Metrics
  setActiveVideoStreams(count: number) {
    this.activeVideoStreamsGauge.set(count);
  }

  incrementActiveVideoStreams() {
    this.activeVideoStreamsGauge.inc();
  }

  decrementActiveVideoStreams() {
    this.activeVideoStreamsGauge.dec();
  }

  // Video Upload/Processing Metrics
  incrementVideoUpload(status: 'success' | 'failed' | 'pending') {
    this.videoUploadsCounter.labels(status).inc();
  }

  recordVideoProcessingDuration(operation: string, duration: number) {
    this.videoProcessingDuration.labels(operation).observe(duration);
  }

  setVideoStorageBytes(bytes: number) {
    this.videoStorageGauge.set(bytes);
  }

  // Health Check Metrics
  incrementHealthCheck(checkType: string, status: 'success' | 'failure') {
    this.healthChecksCounter.labels(checkType, status).inc();
  }

  recordHealthCheckDuration(checkType: string, duration: number) {
    this.healthCheckDuration.labels(checkType).observe(duration);
  }

  setDatabaseConnectionStatus(
    databaseType: 'mongodb' | 'redis',
    status: 0 | 1,
  ) {
    this.databaseConnectionGauge.labels(databaseType).set(status);
  }

  updateApplicationUptime() {
    this.applicationUptimeGauge.set(process.uptime());
  }

  // Authentication Metrics
  incrementAuthRequest(
    type: 'login' | 'register' | 'refresh' | 'logout',
    result: 'success' | 'failure',
  ) {
    this.authRequestsCounter.labels(type, result).inc();
  }

  incrementUserRegistration(method: 'email' | 'phone' | 'google' | 'facebook') {
    this.userRegistrationsCounter.labels(method).inc();
  }

  // Database Operation Metrics
  incrementDatabaseOperation(
    operation: string,
    collection: string,
    result: 'success' | 'error',
  ) {
    this.databaseOperationsCounter.labels(operation, collection, result).inc();
  }

  recordDatabaseOperationDuration(
    operation: string,
    collection: string,
    duration: number,
  ) {
    this.databaseOperationDuration
      .labels(operation, collection)
      .observe(duration);
  }
}
