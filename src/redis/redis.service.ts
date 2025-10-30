import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor(
    private configService: ConfigService,
    private metricsService: MetricsService,
  ) {
    this.initializeRedisClient();
  }

  private async initializeRedisClient() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisDb = this.configService.get<number>('REDIS_DB', 0);

    this.client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            this.logger.warn('Max Redis connection retries reached, giving up');
            return new Error('Max retries reached');
          }
          const delay = Math.min(retries * 50, 500);
          this.logger.log(
            `Redis reconnecting in ${delay}ms (attempt ${retries})`,
          );
          return delay;
        },
        connectTimeout: 5000,
      },
      password: redisPassword || undefined,
      database: redisDb,
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      this.logger.error('Redis Client Error:', error.message);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });

    this.client.on('reconnecting', () => {
      this.isConnected = false;
      this.logger.log('Redis Client Reconnecting');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.log('Redis Client Ready');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      this.logger.log('Redis Client Connection Ended');
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        'Failed to connect to Redis, operating without Redis cache:',
        error.message,
      );
      // Don't throw error, let app continue without Redis
    }
  }

  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string = 'unknown',
  ): Promise<T> {
    if (!this.isConnected) {
      this.metricsService.incrementRedisOperation(operationName, 'error');
      return fallback;
    }

    try {
      const result = await operation();
      this.metricsService.incrementRedisOperation(operationName, 'success');
      return result;
    } catch (error) {
      this.logger.error('Redis operation failed:', error.message);
      this.metricsService.incrementRedisOperation(operationName, 'error');
      return fallback;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.executeWithFallback(() => this.client.get(key), null, 'get');
  }

  async set(
    key: string,
    value: string,
    options?: { EX?: number; PX?: number; NX?: boolean; XX?: boolean },
  ): Promise<string | null> {
    return this.executeWithFallback(
      () => this.client.set(key, value, options),
      null,
      'set',
    );
  }

  async setex(
    key: string,
    seconds: number,
    value: string,
  ): Promise<string | null> {
    return this.executeWithFallback(
      () => this.client.setEx(key, seconds, value),
      null,
      'setex',
    );
  }

  async del(key: string): Promise<number> {
    return this.executeWithFallback(() => this.client.del(key), 0, 'del');
  }

  async exists(key: string): Promise<number> {
    return this.executeWithFallback(() => this.client.exists(key), 0, 'exists');
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.executeWithFallback(
      async () => {
        const result = await this.client.expire(key, seconds);
        return result === 1;
      },
      false,
      'expire',
    );
    return result;
  }

  async ttl(key: string): Promise<number> {
    return this.executeWithFallback(() => this.client.ttl(key), -1, 'ttl');
  }

  async keys(pattern: string): Promise<string[]> {
    return this.executeWithFallback(
      () => this.client.keys(pattern),
      [],
      'keys',
    );
  }

  async flushPattern(pattern: string): Promise<number> {
    return this.executeWithFallback(
      async () => {
        const keys = await this.client.keys(pattern);
        if (keys.length === 0) {
          return 0;
        }
        return await this.client.del(keys);
      },
      0,
      'flushPattern',
    );
  }

  async increment(key: string, by = 1): Promise<number> {
    return this.executeWithFallback(() => this.client.incrBy(key, by), 0);
  }

  async decrement(key: string, by = 1): Promise<number> {
    return this.executeWithFallback(() => this.client.decrBy(key, by), 0);
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    const result = await this.executeWithFallback(
      () => this.client.hGet(key, field),
      null,
    );
    return result || undefined;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.executeWithFallback(
      () => this.client.hSet(key, field, value),
      0,
    );
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.executeWithFallback(() => this.client.hGetAll(key), {});
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.executeWithFallback(() => this.client.hDel(key, field), 0);
  }

  async ping(): Promise<string> {
    return this.executeWithFallback(
      () => this.client.ping(),
      'DISCONNECTED',
      'ping',
    );
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
        this.logger.log('Redis Client Disconnected');
      } catch (error) {
        this.logger.error('Error disconnecting Redis client:', error.message);
      }
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
