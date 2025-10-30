import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Request,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { WatermarkService } from '../../common/services/watermark.service';

// Allowed file types for chat
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_VIDEO_TYPES = ['.mp4', '.mov', '.avi', '.mkv'];
const ALLOWED_AUDIO_TYPES = ['.mp3', '.wav', '.aac', '.m4a'];
const ALLOWED_DOCUMENT_TYPES = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Chat File Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload/chat-files')
export class ChatFileUploadController {
  constructor(private readonly watermarkService: WatermarkService) {}
  @Post()
  @ApiOperation({
    summary: 'Upload file for chat (images, videos, audio, documents)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Determine subdirectory based on file type
          const ext = extname(file.originalname).toLowerCase();
          let subDir = 'files';

          if (ALLOWED_IMAGE_TYPES.includes(ext)) {
            subDir = 'images';
          } else if (ALLOWED_VIDEO_TYPES.includes(ext)) {
            subDir = 'videos';
          } else if (ALLOWED_AUDIO_TYPES.includes(ext)) {
            subDir = 'audio';
          } else if (ALLOWED_DOCUMENT_TYPES.includes(ext)) {
            subDir = 'documents';
          }

          const uploadPath = join(process.cwd(), 'upload', 'chat', subDir);

          // Create directory if it doesn't exist
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const allowedTypes = [
          ...ALLOWED_IMAGE_TYPES,
          ...ALLOWED_VIDEO_TYPES,
          ...ALLOWED_AUDIO_TYPES,
          ...ALLOWED_DOCUMENT_TYPES,
        ];

        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `File type ${ext} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  async uploadChatFile(@UploadedFile() file: any, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Determine file type category
    const ext = extname(file.originalname).toLowerCase();
    let fileType = 'file';

    if (ALLOWED_IMAGE_TYPES.includes(ext)) {
      fileType = 'image';
    } else if (ALLOWED_VIDEO_TYPES.includes(ext)) {
      fileType = 'video';
    } else if (ALLOWED_AUDIO_TYPES.includes(ext)) {
      fileType = 'audio';
    }

    // Apply watermark to images
    if (
      fileType === 'image' &&
      this.watermarkService.isImageFile(file.mimetype)
    ) {
      try {
        console.log('Applying watermark to chat image:', file.originalname);
        const watermarkConfig =
          this.watermarkService.getWatermarkConfig('chat');
        await this.watermarkService.applyWatermark(
          file.path,
          file.path,
          watermarkConfig,
        );
        console.log(
          'Watermark applied successfully to chat image:',
          file.originalname,
        );
      } catch (error) {
        console.warn(
          'Failed to apply watermark to chat image, proceeding without it:',
          (error as Error).message,
        );
        // Continue without watermark - don't block the upload
      }
    }

    // Create relative path for URL
    const relativePath = file.path
      .replace(process.cwd(), '')
      .replace(/\\/g, '/');
    const fileUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

    return {
      success: true,
      file: {
        originalName: file.originalname,
        fileName: file.filename,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        type: fileType,
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
      },
    };
  }
}
