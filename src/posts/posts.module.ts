import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import { Post, PostSchema } from './schemas/post.schema';
import { PostFile, PostFileSchema } from './schemas/post-file.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PostsService } from './services/posts.service';
import { FileUploadService } from './services/file-upload.service';
import { PostFileService } from './services/post-file.service';
import { PostsController } from './controllers/posts.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { WatermarkModule } from '../common/watermark.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: 'PostFile', schema: PostFileSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => NotificationsModule),
    WatermarkModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Ensure upload directory exists
          const uploadDir = './upload';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = uuid();
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(jpg|jpeg|png|webp)$/i;
        const isImage = allowedTypes.test(
          extname(file.originalname).toLowerCase(),
        );

        if (!isImage) {
          return cb(
            new Error(
              'Seules les images sont autorisées (jpg, jpeg, png, webp)',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService, FileUploadService, PostFileService],
  exports: [PostsService, FileUploadService],
})
export class PostsModule {}
