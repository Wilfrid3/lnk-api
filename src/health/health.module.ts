import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MongooseHealthIndicator } from './indicators/mongoose.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { RedisModule } from '../redis/redis.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [TerminusModule, RedisModule, MetricsModule],
  controllers: [HealthController],
  providers: [HealthService, MongooseHealthIndicator, RedisHealthIndicator],
  exports: [HealthService],
})
export class HealthModule {}
