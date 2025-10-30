import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { VideoStreamingService } from '../videos/services/video-streaming.service';
import { VideosCacheService } from '../videos/services/videos-cache.service';

@ApiTags('Metrics Demo')
@Controller('demo')
@Public()
export class DemoController {
  constructor(
    private readonly videoStreamingService: VideoStreamingService,
    private readonly videosCacheService: VideosCacheService,
  ) {}

  @Post('simulate-activity')
  @ApiOperation({
    summary: 'Simulate video activity for metrics demo',
    description:
      'Triggers video streaming activity and cache operations to generate metrics data',
  })
  @ApiOkResponse({
    description: 'Activity simulated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        activeStreams: { type: 'number' },
      },
    },
  })
  async simulateActivity() {
    // Simulate some video streaming activity
    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      this.videoStreamingService.simulateActivity();
    }

    // Simulate some cache operations
    await this.videosCacheService.getFeedCache('demo-user', 1, 10);
    await this.videosCacheService.getVideoCache('demo-video-123', 'demo-user');
    await this.videosCacheService.getCommentsCache('demo-video-123', 1, 20);

    return {
      message: 'Activity simulated successfully',
      activeStreams: this.videoStreamingService.getActiveStreamCount(),
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get current demo status',
    description: 'Returns current active stream count and other demo metrics',
  })
  @ApiOkResponse({
    description: 'Demo status',
    schema: {
      type: 'object',
      properties: {
        activeStreams: { type: 'number' },
        timestamp: { type: 'string' },
      },
    },
  })
  getStatus() {
    return {
      activeStreams: this.videoStreamingService.getActiveStreamCount(),
      timestamp: new Date().toISOString(),
    };
  }
}
