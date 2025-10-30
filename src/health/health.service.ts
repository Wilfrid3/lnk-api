import { Injectable } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { MongooseHealthIndicator } from './indicators/mongoose.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongooseHealthIndicator: MongooseHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
  ) {}

  @HealthCheck()
  async checkHealth() {
    return this.health.check([
      () => this.mongooseHealthIndicator.isHealthy('mongodb'),
      () => this.redisHealthIndicator.isHealthy('redis'),
    ]);
  }

  @HealthCheck()
  async checkReadiness() {
    // Readiness check - same as health for now, but can be customized
    // for example, to check if all migrations are complete, caches are warm, etc.
    return this.health.check([
      () => this.mongooseHealthIndicator.isHealthy('mongodb'),
      () => this.redisHealthIndicator.isHealthy('redis'),
    ]);
  }

  @HealthCheck()
  async checkLiveness() {
    // Liveness check - minimal check to ensure the application is running
    // This should be very lightweight and fast
    return this.health.check([
      () => this.mongooseHealthIndicator.isHealthy('mongodb'),
    ]);
  }

  // Individual service health checks for detailed monitoring
  @HealthCheck()
  async checkDatabase() {
    return this.health.check([
      () => this.mongooseHealthIndicator.isHealthy('mongodb'),
    ]);
  }

  @HealthCheck()
  async checkRedis() {
    return this.health.check([
      () => this.redisHealthIndicator.isHealthy('redis'),
    ]);
  }
}
