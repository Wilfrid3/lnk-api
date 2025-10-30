import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { Video, VideoSchema } from './schemas/video.schema';
import { VideoLike, VideoLikeSchema } from './schemas/video-like.schema';
import { VideoView, VideoViewSchema } from './schemas/video-view.schema';
import {
  VideoComment,
  VideoCommentSchema,
} from './schemas/video-comment.schema';
import {
  VideoCommentLike,
  VideoCommentLikeSchema,
} from './schemas/video-comment-like.schema';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { VideosCacheService } from './services/videos-cache.service';
import { VideoStreamingService } from './services/video-streaming.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: VideoLike.name, schema: VideoLikeSchema },
      { name: VideoView.name, schema: VideoViewSchema },
      { name: VideoComment.name, schema: VideoCommentSchema },
      { name: VideoCommentLike.name, schema: VideoCommentLikeSchema },
    ]),
    UsersModule,
    forwardRef(() => NotificationsModule),
    JwtModule.register({}), // Register JwtModule for the guard
    ConfigModule, // For accessing JWT_SECRET
  ],
  controllers: [VideosController],
  providers: [
    VideosService,
    OptionalJwtAuthGuard,
    VideosCacheService,
    VideoStreamingService,
  ],
  exports: [VideosService],
})
export class VideosModule {}
