import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [VideosModule],
  controllers: [DemoController],
})
export class DemoModule {}
