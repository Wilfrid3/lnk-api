import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';
import { HealthCheckResult } from '@nestjs/terminus';
import { MetricsService } from '../metrics/metrics.service';

@ApiTags('Health')
@Controller('health')
@Public() // Health endpoints should be publicly accessible
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Overall health check',
    description:
      'Returns the overall health status of the application including all dependencies (MongoDB, Redis). Use this endpoint for general monitoring.',
  })
  @ApiOkResponse({
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            mongodb: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            mongodb: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Application is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        info: { type: 'object' },
        error: {
          type: 'object',
          properties: {
            mongodb: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'down' },
                message: { type: 'string' },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'down' },
                message: { type: 'string' },
              },
            },
          },
        },
        details: { type: 'object' },
      },
    },
  })
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const result = await this.healthService.checkHealth();
      const duration = (Date.now() - startTime) / 1000;

      this.metricsService.incrementHealthCheck('overall', 'success');
      this.metricsService.recordHealthCheckDuration('overall', duration);
      this.metricsService.updateApplicationUptime();

      // Update database connection status based on health check result
      if (result.details?.mongodb?.status === 'up') {
        this.metricsService.setDatabaseConnectionStatus('mongodb', 1);
      } else {
        this.metricsService.setDatabaseConnectionStatus('mongodb', 0);
      }

      if (result.details?.redis?.status === 'up') {
        this.metricsService.setDatabaseConnectionStatus('redis', 1);
      } else {
        this.metricsService.setDatabaseConnectionStatus('redis', 0);
      }

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.incrementHealthCheck('overall', 'failure');
      this.metricsService.recordHealthCheckDuration('overall', duration);
      this.metricsService.setDatabaseConnectionStatus('mongodb', 0);
      this.metricsService.setDatabaseConnectionStatus('redis', 0);

      throw new ServiceUnavailableException(error);
    }
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Returns readiness status indicating if the application is ready to serve traffic. Used by Kubernetes readiness probes.',
  })
  @ApiOkResponse({
    description: 'Application is ready',
  })
  @ApiServiceUnavailableResponse({
    description: 'Application is not ready',
  })
  async checkReadiness(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const result = await this.healthService.checkReadiness();
      const duration = (Date.now() - startTime) / 1000;

      this.metricsService.incrementHealthCheck('readiness', 'success');
      this.metricsService.recordHealthCheckDuration('readiness', duration);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.incrementHealthCheck('readiness', 'failure');
      this.metricsService.recordHealthCheckDuration('readiness', duration);

      throw new ServiceUnavailableException(error);
    }
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description:
      'Returns liveness status indicating if the application is running and responsive. Used by Kubernetes liveness probes. This is a lightweight check.',
  })
  @ApiOkResponse({
    description: 'Application is alive',
  })
  @ApiServiceUnavailableResponse({
    description: 'Application is not alive',
  })
  async checkLiveness(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const result = await this.healthService.checkLiveness();
      const duration = (Date.now() - startTime) / 1000;

      this.metricsService.incrementHealthCheck('liveness', 'success');
      this.metricsService.recordHealthCheckDuration('liveness', duration);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.incrementHealthCheck('liveness', 'failure');
      this.metricsService.recordHealthCheckDuration('liveness', duration);

      throw new ServiceUnavailableException(error);
    }
  }

  @Get('database')
  @ApiOperation({
    summary: 'Database health check',
    description:
      'Returns the health status of MongoDB database connection. Use this for specific database monitoring.',
  })
  @ApiOkResponse({
    description: 'Database is healthy',
  })
  @ApiServiceUnavailableResponse({
    description: 'Database is unhealthy',
  })
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const result = await this.healthService.checkDatabase();
      const duration = (Date.now() - startTime) / 1000;

      this.metricsService.incrementHealthCheck('database', 'success');
      this.metricsService.recordHealthCheckDuration('database', duration);
      this.metricsService.setDatabaseConnectionStatus('mongodb', 1);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.incrementHealthCheck('database', 'failure');
      this.metricsService.recordHealthCheckDuration('database', duration);
      this.metricsService.setDatabaseConnectionStatus('mongodb', 0);

      throw new ServiceUnavailableException(error);
    }
  }

  @Get('redis')
  @ApiOperation({
    summary: 'Redis health check',
    description:
      'Returns the health status of Redis cache connection. Use this for specific cache monitoring.',
  })
  @ApiOkResponse({
    description: 'Redis is healthy',
  })
  @ApiServiceUnavailableResponse({
    description: 'Redis is unhealthy',
  })
  async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const result = await this.healthService.checkRedis();
      const duration = (Date.now() - startTime) / 1000;

      this.metricsService.incrementHealthCheck('redis', 'success');
      this.metricsService.recordHealthCheckDuration('redis', duration);
      this.metricsService.setDatabaseConnectionStatus('redis', 1);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.incrementHealthCheck('redis', 'failure');
      this.metricsService.recordHealthCheckDuration('redis', duration);
      this.metricsService.setDatabaseConnectionStatus('redis', 0);

      throw new ServiceUnavailableException(error);
    }
  }

  @Get('debug/redis')
  async debugRedis() {
    try {
      const result = await this.healthService.checkRedis();
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.causes || error,
      };
    }
  }

  @Get('status')
  @ApiOperation({
    summary: 'Simple status check',
    description:
      'Returns a simple OK status without checking dependencies. Use this for basic uptime monitoring when you only need to know if the application is running.',
  })
  @ApiOkResponse({
    description: 'Application is running',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-12-07T10:30:00.000Z' },
        uptime: { type: 'number', example: 3600.5 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'production' },
      },
    },
  })
  async checkStatus() {
    this.metricsService.updateApplicationUptime();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
