import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { UserFileService } from './services/user-file.service';
import { UserServicePackageService } from './services/user-service-package.service';
import { UserEngagementService } from './services/user-engagement.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserRating, UserRatingSchema } from './schemas/user-rating.schema';
import { UsersController } from './users.controller';
import { AdultServicesModule } from '../modules/adult-services/adult-services.module';
import { PostsModule } from '../posts/posts.module';
import { WatermarkModule } from '../common/watermark.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserRating.name, schema: UserRatingSchema },
    ]),
    AdultServicesModule,
    forwardRef(() => PostsModule),
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
            new Error('Only images are allowed (jpg, jpeg, png, webp)'),
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
  providers: [
    UsersService,
    UserFileService,
    UserServicePackageService,
    UserEngagementService,
  ],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
