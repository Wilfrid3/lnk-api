import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
  Response,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { createReadStream } from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { MulterFile } from '../posts/interfaces/file.interface';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { GetVideosDto } from './dto/get-videos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import {
  CreateCommentDto,
  UpdateCommentDto,
  GetCommentsDto,
} from './dto/video-comment.dto';

@ApiTags('videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a new video' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Video upload with metadata',
    schema: {
      type: 'object',
      properties: {
        videoData: {
          type: 'string',
          description: 'Video metadata as JSON string',
        },
        videoFile: {
          type: 'string',
          format: 'binary',
          description: 'Video file (required)',
        },
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Optional thumbnail image',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Video uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        videoUrl: { type: 'string' },
        thumbnailUrl: { type: 'string' },
        duration: { type: 'number' },
        isProcessing: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Create different directories for videos and thumbnails
          const baseDir = path.join(process.cwd(), 'upload', 'videos');
          let uploadDir = baseDir;

          if (file.fieldname === 'thumbnail') {
            uploadDir = path.join(baseDir, 'thumbnails');
          }

          // Ensure directory exists
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          const prefix = file.fieldname === 'thumbnail' ? 'thumb' : 'video';
          cb(null, `${prefix}_${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.fieldname === 'videoFile') {
          // Check video file types
          if (!file.originalname.match(/\.(mp4|webm|avi|mov|mkv)$/i)) {
            return cb(
              new Error(
                'Only video files are allowed (mp4, webm, avi, mov, mkv)',
              ),
              false,
            );
          }
        } else if (file.fieldname === 'thumbnail') {
          // Check image file types
          if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
            return cb(
              new Error(
                'Only image files are allowed for thumbnails (jpg, jpeg, png, webp)',
              ),
              false,
            );
          }
        }
        cb(null, true);
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB for videos
      },
    }),
  )
  async uploadVideo(
    @Request() req: { user: { sub: string } },
    @Body('videoData') videoDataString: string,
    @UploadedFiles() files: MulterFile[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file (video) is required');
    }

    // Parse video metadata from JSON string
    let videoData;
    try {
      videoData = JSON.parse(videoDataString);
    } catch (error) {
      throw new BadRequestException(
        'Invalid video data format. Please provide valid JSON.',
      );
    }

    // Separate video and thumbnail files
    const videoFile = files.find((file) => file.fieldname === 'videoFile');
    const thumbnailFile = files.find((file) => file.fieldname === 'thumbnail');

    if (!videoFile) {
      throw new BadRequestException('Video file is required');
    }

    // Validate required fields
    if (!videoData.title) {
      throw new BadRequestException('Title is required');
    }
    if (!videoData.description) {
      throw new BadRequestException('Description is required');
    }

    const userId = req.user.sub;
    const createVideoDto: CreateVideoDto = {
      title: videoData.title,
      description: videoData.description,
      tags: videoData.tags || [],
      location: videoData.location,
      privacy: videoData.privacy || 'public',
    };

    return this.videosService.uploadVideo(
      userId,
      createVideoDto,
      videoFile,
      thumbnailFile,
    );
  }

  @Get()
  @Public()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get videos feed with pagination and exclusion filters',
    description:
      'Retrieve a paginated list of videos with optional exclusion of specific video IDs',
  })
  @ApiResponse({
    status: 200,
    description: 'Videos feed retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        videos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              videoUrl: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  isVerified: { type: 'boolean' },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  likes: { type: 'number' },
                  comments: { type: 'number' },
                  shares: { type: 'number' },
                  views: { type: 'number' },
                },
              },
              isLiked: { type: 'boolean' },
              duration: { type: 'number' },
              createdAt: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              location: { type: 'string' },
              privacy: { type: 'string' },
            },
          },
        },
        hasMore: { type: 'boolean' },
        currentPage: { type: 'number' },
        totalPages: { type: 'number' },
        totalCount: { type: 'number' },
      },
    },
  })
  async getVideosFeed(
    @Query() query: GetVideosDto,
    @Request() req?: any,
  ) {
    // Try to extract excludes from raw Express query object
    if (!query.excludes && req?.query) {
      const rawQuery = req.query;
      
      // Check for excludes[] format (common when using array query params)
      if (rawQuery['excludes[]']) {
        const excludesValue = rawQuery['excludes[]'];
        if (Array.isArray(excludesValue)) {
          query.excludes = excludesValue.filter(
            (id: any) => id && String(id).length > 0,
          );
        } else if (typeof excludesValue === 'string') {
          query.excludes = [excludesValue];
        }
      }
      // Check for excludes format
      else if (rawQuery.excludes) {
        const excludesValue = rawQuery.excludes;
        if (Array.isArray(excludesValue)) {
          query.excludes = excludesValue.filter(
            (id: any) => id && String(id).length > 0,
          );
        } else if (typeof excludesValue === 'string') {
          query.excludes = [excludesValue];
        }
      }
    }
    
    const currentUserId = req?.user?.sub;
    return this.videosService.getVideosFeed(query, currentUserId);
  }

  @Get('user/:userId')
  @Public()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Récupérer toutes les vidéos d'un utilisateur spécifique",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Liste des vidéos de l'utilisateur récupérée avec succès",
    schema: {
      type: 'object',
      properties: {
        videos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              videoUrl: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  isVerified: { type: 'boolean' },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  likes: { type: 'number' },
                  comments: { type: 'number' },
                  shares: { type: 'number' },
                  views: { type: 'number' },
                },
              },
              isLiked: { type: 'boolean' },
              duration: { type: 'number' },
              createdAt: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              location: { type: 'string' },
              privacy: { type: 'string' },
            },
          },
        },
        hasMore: { type: 'boolean' },
        currentPage: { type: 'number' },
        totalPages: { type: 'number' },
        totalCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID utilisateur invalide',
  })
  async findByUserId(
    @Param('userId') userId: string,
    @Query() query: GetVideosDto,
    @Request() req?: { user?: { sub: string } },
  ) {
    const currentUserId = req?.user?.sub;
    return this.videosService.findByUserId(userId, query, currentUserId);
  }

  @Get(':id/stream')
  @Public()
  @ApiOperation({ summary: 'Stream video file with range support' })
  @ApiResponse({
    status: 200,
    description: 'Video stream',
    headers: {
      'Accept-Ranges': { description: 'bytes' },
      'Content-Type': { description: 'video/mp4' },
      'Content-Length': { description: 'File size in bytes' },
      'Content-Range': { description: 'bytes start-end/total' },
    },
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async streamVideo(
    @Param('id') id: string,
    @Headers('range') range: string,
    @Response() res: ExpressResponse,
    @Request() req: ExpressRequest,
  ) {
    try {
      // Record view (async, non-blocking)
      const userId = (req as any).user?.sub;

      // Get IP address with better extraction for proxies
      const ipAddress =
        (req.headers['x-forwarded-for'] as string) ||
        (req.headers['x-real-ip'] as string) ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      const userAgent = req.headers['user-agent'] || 'unknown';

      // console.log('Recording view for:', {
      //   videoId: id,
      //   userId: userId || 'anonymous',
      //   ipAddress,
      //   userAgent,
      // });

      // Don't await this to avoid blocking the stream
      void this.videosService.recordView(id, userId, ipAddress, userAgent);

      const videoFile = await this.videosService.getVideoFile(id);
      const { filePath, mimeType, fileSize } = videoFile;

      // Set headers for video streaming
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      });

      if (range) {
        // Handle range requests for partial content
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.status(206);
        res.set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize.toString(),
        });

        const stream = createReadStream(filePath, { start, end });
        stream.pipe(res);
      } else {
        // Send entire file
        res.set({
          'Content-Length': fileSize.toString(),
        });

        const stream = createReadStream(filePath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error('Error streaming video:', error);
      res.status(500).json({ error: 'Failed to stream video' });
    }
  }

  @Get(':id/thumbnail')
  @Public()
  @ApiOperation({ summary: 'Get video thumbnail' })
  @ApiResponse({
    status: 200,
    description: 'Video thumbnail',
    headers: {
      'Content-Type': { description: 'image/jpeg' },
    },
  })
  @ApiResponse({ status: 404, description: 'Thumbnail not found' })
  async getThumbnail(
    @Param('id') id: string,
    @Response() res: ExpressResponse,
  ) {
    try {
      const thumbnail = await this.videosService.getThumbnailFile(id);
      const { filePath, mimeType } = thumbnail;

      res.set({
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000',
      });

      const stream = createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      console.error('Error serving thumbnail:', error);
      res.status(404).json({ error: 'Thumbnail not found' });
    }
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or unlike a video' })
  @ApiResponse({
    status: 200,
    description: 'Video like status updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        isLiked: { type: 'boolean' },
        likesCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async likeVideo(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    const userId = req.user.sub;
    return this.videosService.likeVideo(id, userId);
  }

  @Post(':id/share')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track video share' })
  @ApiResponse({
    status: 200,
    description: 'Video share tracked',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        sharesCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async shareVideo(@Param('id') id: string) {
    return this.videosService.shareVideo(id);
  }

  @Get(':id')
  @Public()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get specific video details' })
  @ApiResponse({
    status: 200,
    description: 'Video details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideoById(
    @Param('id') id: string,
    @Request() req?: { user?: { sub: string } },
  ) {
    const currentUserId = req?.user?.sub;
    return this.videosService.getVideoById(id, currentUserId);
  }

  // Comment endpoints
  @Get(':videoId/comments')
  @UseGuards(JwtAuthGuard)
  @Public()
  @ApiOperation({ summary: 'Get video comments' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getComments(
    @Param('videoId') videoId: string,
    @Query() getCommentsDto: GetCommentsDto,
    @Request() req?: { user?: { sub: string } },
  ) {
    const currentUserId = req?.user?.sub;
    return this.videosService.getComments(
      videoId,
      getCommentsDto,
      currentUserId,
    );
  }

  @Post(':videoId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment on a video' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async createComment(
    @Param('videoId') videoId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.videosService.createComment(
      videoId,
      req.user.sub,
      createCommentDto,
    );
  }

  @Get('comments/:commentId/replies')
  @UseGuards(JwtAuthGuard)
  @Public()
  @ApiOperation({ summary: 'Get replies to a comment' })
  @ApiResponse({
    status: 200,
    description: 'Replies retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getReplies(
    @Param('commentId') commentId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req?: { user?: { sub: string } },
  ) {
    const currentUserId = req?.user?.sub;
    return this.videosService.getReplies(commentId, page, limit, currentUserId);
  }

  @Put('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.videosService.updateComment(
      commentId,
      req.user.sub,
      updateCommentDto,
    );
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.videosService.deleteComment(commentId, req.user.sub);
  }

  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like/unlike a comment' })
  @ApiResponse({
    status: 200,
    description: 'Comment like status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async likeComment(
    @Param('commentId') commentId: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.videosService.likeComment(commentId, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une vidéo par ID (soft delete)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vidéo supprimée avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Vidéo supprimée avec succès' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Utilisateur non propriétaire ou vidéo déjà supprimée',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vidéo non trouvée',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorisé',
  })
  async deleteVideo(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.videosService.deleteVideo(id, req.user.sub);
  }
}
