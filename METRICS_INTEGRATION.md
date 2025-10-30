# Prometheus Metrics Integration

## Overview
The API exposes Prometheus-compatible metrics at `/api/metrics` for comprehensive monitoring and observability.

## Available Metrics

### System Metrics (Default)
- **Process CPU Usage**: `process_cpu_user_seconds_total`, `process_cpu_system_seconds_total`
- **Memory Usage**: `process_resident_memory_bytes`, `nodejs_heap_size_*_bytes`
- **Event Loop Lag**: `nodejs_eventloop_lag_*_seconds`
- **Garbage Collection**: `nodejs_gc_duration_seconds`
- **Active Handles/Resources**: `nodejs_active_*`

### Custom Application Metrics
- **HTTP Requests**: `http_requests_total{method, status, route}`
- **HTTP Duration**: `http_request_duration_seconds{method, route}`
- **Redis Operations**: `redis_operations_total{operation, result}`
- **Video Cache**: `video_cache_hits_total{type, cache_type}`
- **Active Streams**: `active_video_streams`

## Usage

### Accessing Metrics
```bash
curl http://localhost:3001/api/metrics
```

### Prometheus Configuration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'lnk-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/metrics'
    scrape_interval: 15s
```

### Grafana Dashboards
Useful queries for monitoring:

```promql
# Request rate
rate(http_requests_total[5m])

# Request duration 95th percentile
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
process_resident_memory_bytes / 1024 / 1024

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Redis operation success rate
rate(redis_operations_total{result="success"}[5m]) / rate(redis_operations_total[5m])

# Video cache hit rate
rate(video_cache_hits_total{type="hit"}[5m]) / rate(video_cache_hits_total[5m])
```

## Architecture

### Components
1. **MetricsModule**: Configures Prometheus integration
2. **MetricsController**: Exposes `/api/metrics` endpoint (public access)
3. **MetricsService**: Provides methods to increment/record metrics
4. **MetricsInterceptor**: Automatically tracks HTTP requests

### Custom Metrics Integration
The `MetricsService` can be injected into any service to track custom metrics:

```typescript
constructor(private readonly metricsService: MetricsService) {}

// Track Redis operations
this.metricsService.incrementRedisOperation('get', 'success');

// Track video cache hits
this.metricsService.incrementVideoCacheHit('hit', 'feed');

// Track active streams
this.metricsService.incrementActiveVideoStreams();
```

## Monitoring Setup

### Health Check Integration
Combine with health checks for comprehensive monitoring:
- **Uptime**: Use `/api/health` for basic health monitoring
- **Metrics**: Use `/api/metrics` for detailed performance monitoring
- **Alerting**: Set up alerts based on error rates, response times, and resource usage

### Recommended Alerts
1. **High Error Rate**: `rate(http_requests_total{status=~"5.."}[5m]) > 0.01`
2. **High Response Time**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1.0`
3. **High Memory Usage**: `process_resident_memory_bytes > 512MB`
4. **Redis Connection Issues**: `rate(redis_operations_total{result="error"}[5m]) > 0`

## Security
- The `/api/metrics` endpoint is publicly accessible (bypasses JWT authentication)
- Consider restricting access via network policies in production
- No sensitive information is exposed in metrics
