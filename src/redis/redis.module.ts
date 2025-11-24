import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD', '');
        const redisDb = configService.get<number>('REDIS_DB', 0);

        try {
          // Try to use redis store
          const { redisStore } = await import('cache-manager-redis-yet');
          const auth = redisPassword ? `:${redisPassword}@` : '';
          const redisUrl = `redis://${auth}${redisHost}:${redisPort}/${redisDb}`;
          return {
            store: redisStore,
            url: redisUrl,
            ttl: 300000, // 5 minutes default TTL in milliseconds
            max: 100, // Maximum number of items in cache
            connectTimeout: 5000,
            commandTimeout: 5000,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
          };
        } catch (error) {
          // Fallback to memory store if Redis store is not available
          console.warn(
            'Redis store not available, falling back to memory store:',
            error.message,
          );
          return {
            ttl: 300000, // 5 minutes default TTL in milliseconds
            max: 100, // Maximum number of items in cache
          };
        }
      },
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
