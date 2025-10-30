// src/cli/cli.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AdultServicesModule } from '../modules/adult-services/adult-services.module';
import { SeedAdultServicesCommand } from './commands/seed-adult-services.command';
import { AddInviteCodesCommand } from './commands/add-invite-codes.command';
import { ApplyWatermarkCommand } from './commands/apply-watermark.command';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PostFile, PostFileSchema } from '../posts/schemas/post-file.schema';
import { WatermarkModule } from '../common/watermark.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/lnk_db',
        );

        const username = configService.get<string>('MONGODB_USERNAME');
        const password = configService.get<string>('MONGODB_PASSWORD');
        const dbName = configService.get<string>('MONGODB_DATABASE', 'lnk_db');

        const hasDbInUri =
          uri.split('/').length > 3 && uri.split('/')[3] !== '';

        let connectionUri = uri;
        if (username && password && !uri.includes('@')) {
          const [protocol, restOfUri] = uri.split('://');
          connectionUri = `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${restOfUri}`;
        }

        if (hasDbInUri && dbName) {
          connectionUri = connectionUri.split('/').slice(0, 3).join('/');
        }

        return {
          uri: connectionUri,
          dbName: dbName,
          authSource: configService.get<string>('MONGODB_AUTH_SOURCE', 'admin'),
        };
      },
    }),
    // Import modules that contain commands
    AdultServicesModule,
    WatermarkModule,
    // Add User model for invite codes command
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: 'PostFile', schema: PostFileSchema },
    ]),
  ],
  providers: [
    // Register all commands here
    SeedAdultServicesCommand,
    AddInviteCodesCommand,
    ApplyWatermarkCommand,
  ],
})
export class CliModule {}
