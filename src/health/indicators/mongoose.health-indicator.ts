import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseHealthIndicator extends HealthIndicator {
  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const isConnected = this.connection.readyState === 1; // 1 = connected
      const result = this.getStatus(key, isConnected, {
        state: this.getConnectionState(this.connection.readyState),
        database: this.connection.name,
        host: this.connection.host,
        port: this.connection.port,
      });

      if (!isConnected) {
        throw new HealthCheckError('MongoDB check failed', result);
      }

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: error.message,
        state: 'disconnected',
      });
      throw new HealthCheckError('MongoDB check failed', result);
    }
  }

  private getConnectionState(readyState: number): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[readyState] || 'unknown';
  }
}
