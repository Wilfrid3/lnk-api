import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisService } from '../../redis/redis.service';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class VideosCacheService {
  private readonly logger = new Logger(VideosCacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private redisService: RedisService,
    private metricsService: MetricsService,
  ) {}

  // Cache keys
  private getCacheKey(prefix: string, ...parts: (string | number)[]): string {
    return `video:${prefix}:${parts.join(':')}`;
  }

  // Video feed cache
  async getFeedCache(userId?: string, page = 1, limit = 10): Promise<any> {
    const key = this.getCacheKey('feed', userId || 'public', page, limit);
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for feed: ${key}`);
        this.metricsService.incrementVideoCacheHit('hit', 'feed');
        return JSON.parse(cached as string);
      }
      this.logger.debug(`Cache miss for feed: ${key}`);
      this.metricsService.incrementVideoCacheHit('miss', 'feed');
      return null;
    } catch (error) {
      this.logger.error(`Error getting feed cache: ${error.message}`);
      return null;
    }
  }

  async setFeedCache(
    data: any,
    userId?: string,
    page = 1,
    limit = 10,
    ttl = 300, // 5 minutes
  ): Promise<void> {
    const key = this.getCacheKey('feed', userId || 'public', page, limit);
    try {
      await this.cacheManager.set(key, JSON.stringify(data), ttl * 1000);
      this.logger.debug(`Cache set for feed: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting feed cache: ${error.message}`);
    }
  }

  async invalidateFeedCache(userId?: string): Promise<void> {
    try {
      const pattern = userId
        ? this.getCacheKey('feed', userId, '*')
        : this.getCacheKey('feed', '*');
      await this.redisService.flushPattern(pattern);
      this.logger.debug(`Feed cache invalidated: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error invalidating feed cache: ${error.message}`);
    }
  }

  // Individual video cache
  async getVideoCache(videoId: string, userId?: string): Promise<any> {
    const key = this.getCacheKey('detail', videoId, userId || 'public');
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for video: ${key}`);
        this.metricsService.incrementVideoCacheHit('hit', 'video');
        return JSON.parse(cached as string);
      }
      this.logger.debug(`Cache miss for video: ${key}`);
      this.metricsService.incrementVideoCacheHit('miss', 'video');
      return null;
    } catch (error) {
      this.logger.error(`Error getting video cache: ${error.message}`);
      return null;
    }
  }

  async setVideoCache(
    videoId: string,
    data: any,
    userId?: string,
    ttl = 600, // 10 minutes
  ): Promise<void> {
    const key = this.getCacheKey('detail', videoId, userId || 'public');
    try {
      await this.cacheManager.set(key, JSON.stringify(data), ttl * 1000);
      this.logger.debug(`Cache set for video: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting video cache: ${error.message}`);
    }
  }

  async invalidateVideoCache(videoId: string): Promise<void> {
    try {
      const pattern = this.getCacheKey('detail', videoId, '*');
      await this.redisService.flushPattern(pattern);
      this.logger.debug(`Video cache invalidated: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error invalidating video cache: ${error.message}`);
    }
  }

  // Comments cache
  async getCommentsCache(
    videoId: string,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
  ): Promise<any> {
    const key = this.getCacheKey('comments', videoId, page, limit, sortBy);
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for comments: ${key}`);
        this.metricsService.incrementVideoCacheHit('hit', 'comments');
        return JSON.parse(cached as string);
      }
      this.logger.debug(`Cache miss for comments: ${key}`);
      this.metricsService.incrementVideoCacheHit('miss', 'comments');
      return null;
    } catch (error) {
      this.logger.error(`Error getting comments cache: ${error.message}`);
      return null;
    }
  }

  async setCommentsCache(
    videoId: string,
    data: any,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    ttl = 300, // 5 minutes
  ): Promise<void> {
    const key = this.getCacheKey('comments', videoId, page, limit, sortBy);
    try {
      await this.cacheManager.set(key, JSON.stringify(data), ttl * 1000);
      this.logger.debug(`Cache set for comments: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting comments cache: ${error.message}`);
    }
  }

  async invalidateCommentsCache(videoId: string): Promise<void> {
    try {
      const pattern = this.getCacheKey('comments', videoId, '*');
      await this.redisService.flushPattern(pattern);
      this.logger.debug(`Comments cache invalidated: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error invalidating comments cache: ${error.message}`);
    }
  }

  // Comment replies cache
  async getCommentRepliesCache(
    commentId: string,
    page = 1,
    limit = 10,
  ): Promise<any> {
    const key = this.getCacheKey('replies', commentId, page, limit);
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for replies: ${key}`);
        return JSON.parse(cached as string);
      }
      this.logger.debug(`Cache miss for replies: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting replies cache: ${error.message}`);
      return null;
    }
  }

  async setCommentRepliesCache(
    commentId: string,
    data: any,
    page = 1,
    limit = 10,
    ttl = 300, // 5 minutes
  ): Promise<void> {
    const key = this.getCacheKey('replies', commentId, page, limit);
    try {
      await this.cacheManager.set(key, JSON.stringify(data), ttl * 1000);
      this.logger.debug(`Cache set for replies: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting replies cache: ${error.message}`);
    }
  }

  async invalidateCommentRepliesCache(commentId: string): Promise<void> {
    try {
      const pattern = this.getCacheKey('replies', commentId, '*');
      await this.redisService.flushPattern(pattern);
      this.logger.debug(`Comment replies cache invalidated: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error invalidating replies cache: ${error.message}`);
    }
  }

  // Stats cache (likes, views, comments count)
  async getStatsCache(videoId: string): Promise<any> {
    const key = this.getCacheKey('stats', videoId);
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for stats: ${key}`);
        return JSON.parse(cached as string);
      }
      this.logger.debug(`Cache miss for stats: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting stats cache: ${error.message}`);
      return null;
    }
  }

  async setStatsCache(
    videoId: string,
    data: any,
    ttl = 60, // 1 minute for frequently changing stats
  ): Promise<void> {
    const key = this.getCacheKey('stats', videoId);
    try {
      await this.cacheManager.set(key, JSON.stringify(data), ttl * 1000);
      this.logger.debug(`Cache set for stats: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting stats cache: ${error.message}`);
    }
  }

  async invalidateStatsCache(videoId: string): Promise<void> {
    try {
      const key = this.getCacheKey('stats', videoId);
      await this.cacheManager.del(key);
      this.logger.debug(`Stats cache invalidated: ${key}`);
    } catch (error) {
      this.logger.error(`Error invalidating stats cache: ${error.message}`);
    }
  }

  // User-specific cache (for user's liked videos, etc.)
  async getUserVideoStatusCache(userId: string, videoId: string): Promise<any> {
    const key = this.getCacheKey('user_status', userId, videoId);
    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for user status: ${key}`);
        return JSON.parse(cached as string);
      }
      this.logger.debug(`Cache miss for user status: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting user status cache: ${error.message}`);
      return null;
    }
  }

  async setUserVideoStatusCache(
    userId: string,
    videoId: string,
    data: any,
    ttl = 3600, // 1 hour
  ): Promise<void> {
    const key = this.getCacheKey('user_status', userId, videoId);
    try {
      await this.cacheManager.set(key, JSON.stringify(data), ttl * 1000);
      this.logger.debug(`Cache set for user status: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting user status cache: ${error.message}`);
    }
  }

  async invalidateUserVideoStatusCache(
    userId: string,
    videoId: string,
  ): Promise<void> {
    try {
      const key = this.getCacheKey('user_status', userId, videoId);
      await this.cacheManager.del(key);
      this.logger.debug(`User status cache invalidated: ${key}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating user status cache: ${error.message}`,
      );
    }
  }

  // Clear all video-related cache
  async clearAllVideoCache(): Promise<void> {
    try {
      await this.redisService.flushPattern('video:*');
      this.logger.log('All video cache cleared');
    } catch (error) {
      this.logger.error(`Error clearing all video cache: ${error.message}`);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redisService.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return false;
    }
  }

  // Get Redis connection status
  getConnectionStatus(): boolean {
    return this.redisService.getConnectionStatus();
  }
}
