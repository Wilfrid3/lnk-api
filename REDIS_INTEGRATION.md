# Redis Integration for LNK API

## Overview

Redis has been successfully integrated into the LNK API to improve performance through caching. The integration includes:

- **Redis Connection Service**: Direct Redis operations
- **Cache Manager Integration**: NestJS cache manager with Redis store
- **Video Caching**: Comprehensive caching for video feeds, details, comments, and user interactions
- **Automatic Cache Invalidation**: Smart cache invalidation when data changes

## 🚀 Setup & Configuration

### 1. Redis Server Setup

**Using Docker (Recommended):**
```bash
# Start Redis with port mapping
docker run -d --name some-redis -p 6379:6379 redis

# Verify Redis is running
docker ps | findstr redis

# Test Redis connection
docker exec -it some-redis redis-cli ping
# Should return: PONG
```

### 2. Environment Variables

Add to your `.env` file:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Dependencies

The following packages are installed:
```json
{
  "redis": "^4.x",
  "@nestjs/cache-manager": "^2.x",
  "cache-manager": "^5.x",
  "cache-manager-redis-yet": "^5.x"
}
```

## 📁 Architecture

### Redis Module Structure
```
src/redis/
├── redis.module.ts        # Global Redis module configuration
├── redis.service.ts       # Direct Redis operations service
└── ../videos/services/
    └── videos-cache.service.ts  # Video-specific caching logic
```

### Key Components

1. **RedisModule** (`src/redis/redis.module.ts`)
   - Global module providing Redis connectivity
   - Automatic fallback to memory cache if Redis unavailable
   - Configures both cache-manager and direct Redis client

2. **RedisService** (`src/redis/redis.service.ts`)
   - Direct Redis operations (get, set, del, etc.)
   - Connection management and error handling
   - Health checks and reconnection logic

3. **VideosCacheService** (`src/videos/services/videos-cache.service.ts`)
   - Video-specific caching strategies
   - Cache key generation and management
   - Cache invalidation logic

## 🎯 Caching Strategy

### Cache Types

1. **Video Feed Cache**
   - **Key Pattern**: `video:feed:{userId|public}:{page}:{limit}`
   - **TTL**: 5 minutes (300 seconds)
   - **Purpose**: Cache paginated video feeds

2. **Video Details Cache**
   - **Key Pattern**: `video:detail:{videoId}:{userId|public}`
   - **TTL**: 10 minutes (600 seconds)
   - **Purpose**: Cache individual video details with user context

3. **Comments Cache**
   - **Key Pattern**: `video:comments:{videoId}:{page}:{limit}:{sortBy}`
   - **TTL**: 5 minutes (300 seconds)
   - **Purpose**: Cache video comments with pagination

4. **Comment Replies Cache**
   - **Key Pattern**: `video:replies:{commentId}:{page}:{limit}`
   - **TTL**: 5 minutes (300 seconds)
   - **Purpose**: Cache comment replies

5. **Video Stats Cache**
   - **Key Pattern**: `video:stats:{videoId}`
   - **TTL**: 1 minute (60 seconds)
   - **Purpose**: Cache frequently changing stats (likes, views, comments count)

6. **User Video Status Cache**
   - **Key Pattern**: `video:user_status:{userId}:{videoId}`
   - **TTL**: 1 hour (3600 seconds)
   - **Purpose**: Cache user-specific video interactions (liked status, etc.)

### Cache Invalidation Strategy

**Smart invalidation** happens automatically when:

- **Video Upload**: Invalidates feed caches
- **Video Like/Unlike**: Invalidates video details, stats, user status, and feed caches
- **Comment Creation**: Invalidates comments cache and video details (for comment count)
- **Comment Deletion**: Invalidates comments cache and video details
- **Comment Like**: No cache invalidation (handled at response level)

## 🔧 Usage Examples

### 1. Getting Cached Video Feed
```typescript
// In VideosService
const cachedFeed = await this.cacheService.getFeedCache(userId, page, limit);
if (cachedFeed) {
  return cachedFeed;
}
// ... fetch from database and cache result
await this.cacheService.setFeedCache(response, userId, page, limit, 300);
```

### 2. Cache Invalidation
```typescript
// After video like/unlike
await this.cacheService.invalidateVideoCache(videoId);
await this.cacheService.invalidateStatsCache(videoId);
await this.cacheService.invalidateUserVideoStatusCache(userId, videoId);
await this.cacheService.invalidateFeedCache(); // Public feed
await this.cacheService.invalidateFeedCache(userId); // User-specific feed
```

### 3. Direct Redis Operations
```typescript
// Using RedisService directly
const value = await this.redisService.get('custom-key');
await this.redisService.set('custom-key', 'value', { EX: 3600 });
await this.redisService.del('custom-key');
```

## 📊 Performance Benefits

### Expected Performance Improvements

1. **Video Feed Loading**
   - **Before**: ~200-500ms database queries
   - **After**: ~10-50ms cache hits
   - **Improvement**: 80-90% faster response times

2. **Video Details**
   - **Before**: Multiple database queries (video + user + likes)
   - **After**: Single cache lookup
   - **Improvement**: 70-85% faster response times

3. **Comments Loading**
   - **Before**: Complex nested queries with population
   - **After**: Pre-formatted cached responses
   - **Improvement**: 60-80% faster response times

### Cache Hit Rate Monitoring

Monitor cache effectiveness with:
```typescript
// Health check endpoint
const isRedisHealthy = await this.cacheService.healthCheck();
```

## 🛠️ Debugging & Monitoring

### Redis Connection Logs
The application logs Redis connection status:
```
[Nest] LOG [RedisService] Redis Client Connected
[Nest] LOG [RedisService] Redis Client Ready
```

### Cache Debug Logs
Cache operations are logged (can be enabled):
```
[Nest] DEBUG Cache hit for feed: video:feed:public:1:10
[Nest] DEBUG Cache miss for video: video:detail:60a7b8e5f1b2c3d4e5f6g7h8:public
```

### Testing Redis Connection
```javascript
// test-redis.js
node test-redis.js
// Should output:
// ✅ Redis connection successful!
// ✅ Redis set/get test: Hello Redis!
// ✅ Redis ping test: PONG
```

## 🔒 Error Handling & Failover

### Graceful Degradation
- If Redis is unavailable, the application falls back to memory caching
- Database operations continue normally without caching
- No user-facing errors from Redis failures

### Automatic Reconnection
- Redis client automatically attempts reconnection
- Exponential backoff strategy for reconnection attempts
- Connection state logging for monitoring

## 🚀 Deployment Considerations

### Production Setup
1. **Redis Persistence**: Configure Redis data persistence
2. **Redis Clustering**: Use Redis Cluster for high availability
3. **Memory Management**: Set appropriate `maxmemory` and eviction policies
4. **Monitoring**: Implement Redis metrics monitoring
5. **Backup Strategy**: Regular Redis backup for critical cached data

### Environment-Specific Configuration
```env
# Development
REDIS_HOST=localhost
REDIS_PORT=6379

# Production
REDIS_HOST=redis-cluster.production.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
REDIS_DB=0
```

## 📈 Monitoring & Metrics

### Key Metrics to Monitor
1. **Cache Hit Rate**: Percentage of requests served from cache
2. **Redis Memory Usage**: Monitor Redis memory consumption
3. **Response Times**: Compare cached vs non-cached response times
4. **Redis Connection Health**: Monitor connection status
5. **Cache Invalidation Frequency**: Track cache invalidation patterns

### Health Check Endpoint
Add to your application:
```typescript
@Get('health/redis')
async checkRedisHealth() {
  return {
    redis: await this.cacheService.healthCheck(),
    timestamp: new Date().toISOString(),
  };
}
```

## 🎉 Summary

Redis integration is now complete and provides:

✅ **Performance**: Significant response time improvements
✅ **Scalability**: Reduced database load
✅ **Reliability**: Graceful fallback mechanisms
✅ **Maintainability**: Clean separation of caching concerns
✅ **Flexibility**: Easy cache configuration and management

The video system now benefits from intelligent caching that automatically manages data consistency while providing substantial performance improvements.

Current Status: ✅ All Health Endpoints Working:

/api/health - Shows both MongoDB and Redis status
/api/health/redis - Redis-specific health check
/api/health/database - MongoDB-specific health check
/api/health/ready - Readiness check (MongoDB + Redis)
/api/health/live - Liveness check (MongoDB only)
/api/health/debug/redis - Debug Redis health check
