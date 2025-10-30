import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Get connection status and ping result
      const connectionStatus = this.redisService.getConnectionStatus();
      const pingResult = await this.redisService.ping();
      const isHealthy = pingResult === 'PONG';

      this.logger.debug(
        `Redis health check - Connected: ${connectionStatus}, Ping: ${pingResult}, Healthy: ${isHealthy}`,
      );

      return this.getStatus(key, isHealthy, {
        status: isHealthy ? 'up' : 'down',
        connectionStatus: connectionStatus ? 'connected' : 'disconnected',
        ping: pingResult,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Redis health check failed: ${(error as Error).message}`,
      );

      return this.getStatus(key, false, {
        status: 'down',
        connectionStatus: 'error',
        error: (error as Error).message,
        lastChecked: new Date().toISOString(),
      });
    }
  }
}
