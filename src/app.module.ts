import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnalyticsInterceptor } from './analytics/analytics.interceptor';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { PostsModule } from './posts/posts.module';
import { AdultServicesModule } from './modules/adult-services/adult-services.module';
import { EmailModule } from './email/email.module';
import { VideosModule } from './videos/videos.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Get MongoDB URI from environment variables
        const uri = configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/lnk',
        );

        // Get optional auth credentials from environment variables
        const username = configService.get<string>('MONGODB_USERNAME');
        const password = configService.get<string>('MONGODB_PASSWORD');

        // Get database name from environment or use default
        const dbName = configService.get<string>('MONGODB_DATABASE', 'lnk');

        // Check if URI already has a database name
        const hasDbInUri =
          uri.split('/').length > 3 && uri.split('/')[3] !== '';

        // If credentials are provided and URI doesn't already contain auth
        let connectionUri = uri;
        if (username && password && !uri.includes('@')) {
          // Extract protocol and the rest of the URI
          const [protocol, restOfUri] = uri.split('://');
          connectionUri = `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${restOfUri}`;
        }

        // Remove the database name from URI if we're going to specify it separately
        if (hasDbInUri && dbName) {
          connectionUri = connectionUri.split('/').slice(0, 3).join('/');
        }

        return {
          uri: connectionUri,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          dbName: dbName, // Explicitly set the database name
          authSource: configService.get<string>('MONGODB_AUTH_SOURCE', 'admin'),
        };
      },
    }),
    AuthModule,
    UsersModule,
    EmailModule,
    AnalyticsModule,
    PostsModule,
    AdultServicesModule,
    VideosModule,
    HealthModule,
    MetricsModule,
    MessagingModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [
    // Apply JWT guard globally
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply analytics interceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: AnalyticsInterceptor,
    },
    // Apply metrics interceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
