import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { register } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Metrics')
@Controller('metrics')
@Public() // Make metrics endpoint publicly accessible
export class MetricsController {
  @Get()
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description:
      'Returns Prometheus-compatible metrics for monitoring. This endpoint provides system metrics like memory usage, HTTP request counts, response times, and custom application metrics.',
  })
  @ApiOkResponse({
    description: 'Prometheus metrics in text format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: `# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.15

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status_code="200"} 42`,
        },
      },
    },
  })
  async getMetrics(@Res() response: Response): Promise<void> {
    const metrics = await register.metrics();
    response.set('Content-Type', register.contentType);
    response.send(metrics);
  }
}
