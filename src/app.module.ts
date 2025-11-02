import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    MongooseModule.forRoot(
      // 'mongodb+srv://kaliodev:kaliodev@kaiodevcluster.1my9s.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
      'mongodb+srv://kalio:J5cMxQjisKRiBN9k@cluster0.ryiikhl.mongodb.net/lnk?retryWrites=true&w=majority',
      // 'mongodb://127.0.0.1:27017/kaliodb',
    ),
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
