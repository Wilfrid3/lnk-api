# Grafana Queries and Dashboard Configuration

## 🚀 **Quick Dashboard Setup Guide**

### **Essential Panels for Main Dashboard:**
1. **System Health** - `database_connection_status` (Stat Panel, Boolean)
2. **API Success Rate** - `(rate(http_requests_total{status=~"2.."}[5m]) / rate(http_requests_total[5m])) * 100` (Gauge, %)
3. **Response Time** - `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` (Graph, seconds)
4. **Active Streams** - `active_video_streams` (Stat, count)
5. **Cache Hit Rate** - `(rate(video_cache_hits_total{type="hit"}[5m]) / rate(video_cache_hits_total[5m])) * 100` (Gauge, %)
6. **Redis Health** - `(rate(redis_operations_total{result="success"}[5m]) / rate(redis_operations_total[5m])) * 100` (Gauge, %)

### **Panel Type Quick Reference:**
- **Stat Panel**: Single value metrics, success rates, counts
- **Gauge**: Percentage values with thresholds
- **Time Series (Graph)**: Trends over time, rates, durations
- **Table**: Top N results, slowest operations
- **Pie Chart**: Distribution of categories

## 🎯 **Complete Metrics Overview**

### 1. **HTTP Request Metrics**

#### HTTP Request Rate (requests/minute)
```promql
rate(http_requests_total[5m]) * 60
```
- **Visualization**: Time Series (Graph)
- **Unit**: req/min
- **Panel Type**: Graph

#### HTTP Error Rate (%)
```promql
(
  rate(http_requests_total{status=~"4..|5.."}[5m]) /
  rate(http_requests_total[5m])
) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (< 1%), Yellow (1-5%), Red (> 5%)

#### HTTP Request Duration (95th percentile)
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```
- **Visualization**: Time Series (Graph)
- **Unit**: seconds (s)
- **Panel Type**: Graph

#### Top Slowest Endpoints
```promql
topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
```
- **Visualization**: Table
- **Unit**: seconds (s)
- **Panel Type**: Table

### 2. **Health Check Metrics**

#### Health Check Success Rate (%)
```promql
(
  rate(health_checks_total{status="success"}[5m]) /
  rate(health_checks_total[5m])
) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (> 95%), Yellow (90-95%), Red (< 90%)

#### Database Connection Status
```promql
database_connection_status
```
- **Visualization**: Stat Panel
- **Unit**: Boolean (0=Down, 1=Up)
- **Thresholds**: Green (1), Red (0)
- **Value Mappings**: 0=DOWN, 1=UP

#### Health Check Response Time
```promql
histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m]))
```
- **Visualization**: Time Series (Graph)
- **Unit**: seconds (s)
- **Panel Type**: Graph

#### Application Uptime (hours)
```promql
application_uptime_seconds / 3600
```
- **Visualization**: Stat Panel
- **Unit**: hours (h)
- **Panel Type**: Stat

### 3. **Authentication Metrics**

#### Login Success Rate (%)
```promql
(
  rate(auth_requests_total{type="login",result="success"}[5m]) /
  rate(auth_requests_total{type="login"}[5m])
) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (> 95%), Yellow (90-95%), Red (< 90%)

#### Registration Rate (registrations/hour)
```promql
rate(user_registrations_total[1h]) * 3600
```
- **Visualization**: Time Series (Graph)
- **Unit**: registrations/hour
- **Panel Type**: Graph

#### Registration Methods Distribution
```promql
sum by (method) (rate(user_registrations_total[5m]))
```
- **Visualization**: Pie Chart or Bar Chart
- **Unit**: registrations/sec
- **Panel Type**: Pie Chart

#### Authentication Failures (per minute)
```promql
rate(auth_requests_total{result="failure"}[5m]) * 60
```
- **Visualization**: Time Series (Graph)
- **Unit**: failures/min
- **Panel Type**: Graph
- **Color**: Red/Orange

### 4. **Redis Performance Metrics**

#### Redis Success Rate (%)
```promql
(
  rate(redis_operations_total{result="success"}[5m]) /
  rate(redis_operations_total[5m])
) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (> 99%), Yellow (95-99%), Red (< 95%)

#### Redis Operations Rate (ops/sec)
```promql
rate(redis_operations_total[5m])
```
- **Visualization**: Time Series (Graph)
- **Unit**: ops/sec
- **Panel Type**: Graph

#### Redis Error Rate (errors/min)
```promql
rate(redis_operations_total{result="error"}[5m]) * 60
```
- **Visualization**: Time Series (Graph)
- **Unit**: errors/min
- **Panel Type**: Graph
- **Color**: Red

### 5. **Video System Metrics**

#### Video Cache Hit Rate (%)
```promql
(
  rate(video_cache_hits_total{type="hit"}[5m]) /
  rate(video_cache_hits_total[5m])
) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (> 80%), Yellow (60-80%), Red (< 60%)

#### Video Cache Miss Rate (%)
```promql
(
  rate(video_cache_hits_total{type="miss"}[5m]) /
  rate(video_cache_hits_total[5m])
) * 100
```
- **Visualization**: Stat Panel
- **Unit**: percent (0-100)
- **Color**: Orange/Red

#### Active Video Streams
```promql
active_video_streams
```
- **Visualization**: Stat Panel with Sparkline
- **Unit**: streams (count)
- **Panel Type**: Stat
- **Color**: Blue/Purple

#### Video Upload Success Rate (%)
```promql
(
  rate(video_uploads_total{status="success"}[5m]) /
  rate(video_uploads_total[5m])
) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (> 95%), Yellow (90-95%), Red (< 90%)

#### Video Processing Time (95th percentile)
```promql
histogram_quantile(0.95, rate(video_processing_duration_seconds_bucket[5m]))
```
- **Visualization**: Time Series (Graph)
- **Unit**: seconds (s)
- **Panel Type**: Graph

#### Video Storage Usage (GB)
```promql
video_storage_bytes / (1024^3)
```
- **Visualization**: Stat Panel
- **Unit**: bytes (GB)
- **Panel Type**: Stat

### 6. **Database Performance Metrics**

#### Database Operation Success Rate (%)
```promql
(
  rate(database_operations_total{result="success"}[5m]) /
  rate(database_operations_total[5m])
) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (> 99%), Yellow (95-99%), Red (< 95%)

#### Database Query Response Time (by collection)
```promql
histogram_quantile(0.95, 
  rate(database_operation_duration_seconds_bucket[5m])
)
```
- **Visualization**: Time Series (Graph) or Heatmap
- **Unit**: seconds (s)
- **Panel Type**: Graph
- **Legend**: By Collection

#### Top Slowest Database Operations
```promql
topk(10, histogram_quantile(0.95, 
  rate(database_operation_duration_seconds_bucket[5m])
))
```
- **Visualization**: Table
- **Unit**: seconds (s)
- **Panel Type**: Table

### 7. **System Resource Metrics**

#### CPU Usage (%)
```promql
(1 - rate(process_cpu_seconds_total[5m])) * 100
```
- **Visualization**: Time Series (Graph)
- **Unit**: percent (0-100)
- **Panel Type**: Graph
- **Thresholds**: Green (< 70%), Yellow (70-90%), Red (> 90%)

#### Memory Usage (MB)
```promql
process_resident_memory_bytes / (1024^2)
```
- **Visualization**: Time Series (Graph)
- **Unit**: bytes (MB)
- **Panel Type**: Graph

#### Memory Usage (%)
```promql
(process_resident_memory_bytes / process_virtual_memory_bytes) * 100
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (< 80%), Yellow (80-95%), Red (> 95%)

#### Event Loop Lag
```promql
nodejs_eventloop_lag_seconds
```
- **Visualization**: Time Series (Graph)
- **Unit**: seconds (s)
- **Panel Type**: Graph
- **Color**: Orange

### 8. **Advanced Business Metrics**

#### User Engagement Rate
```promql
rate(http_requests_total{route=~"/api/videos.*"}[5m])
```
- **Visualization**: Time Series (Graph)
- **Unit**: requests/sec
- **Panel Type**: Graph
- **Color**: Purple

#### API Throughput (requests/second)
```promql
sum(rate(http_requests_total[5m]))
```
- **Visualization**: Stat Panel with Sparkline
- **Unit**: requests/sec
- **Panel Type**: Stat

#### Error Budget Burn Rate
```promql
1 - (
  rate(http_requests_total{status=~"2.."}[5m]) /
  rate(http_requests_total[5m])
)
```
- **Visualization**: Stat Panel with Gauge
- **Unit**: decimal (0-1)
- **Thresholds**: Green (< 0.01), Yellow (0.01-0.05), Red (> 0.05)

## 🔧 **Grafana Dashboard Setup Instructions**

### **Complete Dashboard Panels Configuration:**

#### Panel 1: Overall System Health
- **Query**: `database_connection_status`
- **Visualization**: Stat Panel
- **Unit**: Boolean (Custom: 0=DOWN, 1=UP)
- **Thresholds**: Green (1), Red (0)
- **Value Mappings**: 0 → DOWN (Red), 1 → UP (Green)
- **Size**: Small (3x2)

#### Panel 2: HTTP Request Rate
- **Query**: `rate(http_requests_total[5m]) * 60`
- **Visualization**: Time Series (Graph)
- **Unit**: req/min
- **Color**: Blue
- **Size**: Medium (6x4)

#### Panel 3: Error Rate
- **Query**: `(rate(http_requests_total{status=~"4..|5.."}[5m]) / rate(http_requests_total[5m])) * 100`
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (0-1), Yellow (1-5), Red (5-100)
- **Size**: Small (3x3)

#### Panel 4: Response Time (95th percentile)
- **Query**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- **Visualization**: Time Series (Graph)
- **Unit**: seconds (s)
- **Color**: Orange
- **Size**: Medium (6x4)

#### Panel 5: Authentication Success Rate
- **Query**: `(rate(auth_requests_total{type="login",result="success"}[5m]) / rate(auth_requests_total{type="login"}[5m])) * 100`
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (95-100), Yellow (90-95), Red (0-90)
- **Size**: Small (3x3)

#### Panel 6: Video Cache Performance
- **Query**: `(rate(video_cache_hits_total{type="hit"}[5m]) / rate(video_cache_hits_total[5m])) * 100`
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (80-100), Yellow (60-80), Red (0-60)
- **Size**: Small (3x3)

#### Panel 7: Active Video Streams
- **Query**: `active_video_streams`
- **Visualization**: Stat Panel with Sparkline
- **Unit**: streams (count)
- **Color**: Purple
- **Size**: Small (3x2)

#### Panel 8: Redis Performance
- **Query**: `(rate(redis_operations_total{result="success"}[5m]) / rate(redis_operations_total[5m])) * 100`
- **Visualization**: Stat Panel with Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green (99-100), Yellow (95-99), Red (0-95)
- **Size**: Small (3x3)

#### Panel 9: Application Uptime
- **Query**: `application_uptime_seconds / 3600`
- **Visualization**: Stat Panel
- **Unit**: hours (h)
- **Color**: Green
- **Size**: Small (3x2)

#### Panel 10: Memory Usage
- **Query**: `process_resident_memory_bytes / (1024^2)`
- **Visualization**: Time Series (Graph)
- **Unit**: bytes (MB)
- **Color**: Blue
- **Size**: Medium (6x4)

#### Panel 11: Top Slowest Endpoints (Table)
- **Query**: `topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))`
- **Visualization**: Table
- **Unit**: seconds (s)
- **Columns**: Endpoint, Response Time
- **Size**: Large (12x6)

### **Dashboard Layout Recommendation:**
```
Row 1: [System Health] [Active Streams] [Uptime] [Error Rate]
Row 2: [HTTP Request Rate Graph                ] [Response Time Graph          ]
Row 3: [Auth Success] [Cache Performance] [Redis Health] [Memory Graph         ]
Row 4: [Top Slowest Endpoints Table                                            ]
```

## 🚀 **Alert Rules (Prometheus)**

### Critical Alerts:
```yaml
- alert: HighErrorRate
  expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100 > 5
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: High error rate detected

- alert: DatabaseDown
  expr: database_connection_status{database_type="mongodb"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: Database connection lost

- alert: RedisDown
  expr: database_connection_status{database_type="redis"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: Redis connection lost

- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: High response time detected
```

## 📊 **Grafana Variable Configuration**

### Time Range Variables:
- `$__interval` - Auto interval
- `$__range` - Selected time range

### Label Variables:
```
$route - label_values(http_requests_total, route)
$method - label_values(http_requests_total, method)
$status - label_values(http_requests_total, status)
$operation - label_values(redis_operations_total, operation)
```

## 🎨 **Color Coding Recommendations**
- **Green**: Success rates > 95%
- **Yellow**: Success rates 90-95%
- **Red**: Success rates < 90%
- **Blue**: Neutral metrics (counts, durations)
- **Orange**: Warning thresholds
- **Purple**: Video/streaming metrics
