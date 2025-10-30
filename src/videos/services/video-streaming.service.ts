import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class VideoStreamingService {
  private readonly logger = new Logger(VideoStreamingService.name);
  private activeStreams: Set<string> = new Set();

  constructor(private readonly metricsService: MetricsService) {}

  startStream(sessionId: string, videoId: string): void {
    if (!this.activeStreams.has(sessionId)) {
      this.activeStreams.add(sessionId);
      this.metricsService.incrementActiveVideoStreams();
      this.logger.debug(
        `Started stream ${sessionId} for video ${videoId}. Active streams: ${this.activeStreams.size}`,
      );
    }
  }

  endStream(sessionId: string): void {
    if (this.activeStreams.has(sessionId)) {
      this.activeStreams.delete(sessionId);
      this.metricsService.decrementActiveVideoStreams();
      this.logger.debug(
        `Ended stream ${sessionId}. Active streams: ${this.activeStreams.size}`,
      );
    }
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  // Simulate some video streaming activity for demo purposes
  simulateActivity(): void {
    const actions = ['start', 'end'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const sessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
    const videoId = `video_${Math.floor(Math.random() * 100)}`;

    if (action === 'start' || this.activeStreams.size === 0) {
      this.startStream(sessionId, videoId);
    } else {
      // End a random active stream
      const activeSessionIds = Array.from(this.activeStreams);
      if (activeSessionIds.length > 0) {
        const randomSessionId =
          activeSessionIds[Math.floor(Math.random() * activeSessionIds.length)];
        this.endStream(randomSessionId);
      }
    }
  }
}
