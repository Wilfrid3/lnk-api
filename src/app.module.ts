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
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
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
